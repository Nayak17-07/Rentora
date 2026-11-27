const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '../../../');

/**
 * Automatically discovers the appropriate Python executable across
 * Windows, Linux, Docker containers, and virtualenvs.
 */
function getPythonBinary() {
  if (process.env.PYTHON_BIN && fs.existsSync(process.env.PYTHON_BIN)) {
    return process.env.PYTHON_BIN;
  }

  const candidates = [
    path.join(PROJECT_ROOT, 'venv', 'Scripts', 'python.exe'), // Windows venv
    path.join(PROJECT_ROOT, 'venv', 'bin', 'python'),          // Linux/macOS/Docker venv
    path.join(PROJECT_ROOT, '.venv', 'Scripts', 'python.exe'),
    path.join(PROJECT_ROOT, '.venv', 'bin', 'python'),
    'python3',
    'python'
  ];

  for (const candidate of candidates) {
    if (path.isAbsolute(candidate)) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } else {
      // System executable
      return candidate;
    }
  }

  return 'python';
}

/**
 * Executes an ML Python script with environment safety, project root in PYTHONPATH,
 * and promise-based timeout handling.
 *
 * @param {string} scriptRelativePath - Path relative to project root
 * @param {Array<string>} [args=[]] - CLI arguments
 * @param {number} [timeoutMs=60000] - Max runtime before timeout
 * @returns {Promise<{ stdout: string, stderr: string }>}
 */
function runPythonScript(scriptRelativePath, args = [], timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const pythonBin = getPythonBinary();
    const scriptPath = path.resolve(PROJECT_ROOT, scriptRelativePath);

    if (!fs.existsSync(scriptPath)) {
      return reject(new Error(`Python script not found at path: ${scriptPath}`));
    }

    const env = {
      ...process.env,
      PYTHONPATH: PROJECT_ROOT,
      PYTHONUNBUFFERED: '1'
    };

    const proc = spawn(pythonBin, [scriptPath, ...args], {
      cwd: PROJECT_ROOT,
      env
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGTERM');
      reject(new Error(`Execution timed out after ${timeoutMs / 1000} seconds for ${scriptRelativePath}`));
    }, timeoutMs);

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) return;

      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const err = new Error(`Python script exited with code ${code}.\nDetails: ${stderr || stdout}`);
        err.code = code;
        err.stdout = stdout;
        err.stderr = stderr;
        reject(err);
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

module.exports = {
  getPythonBinary,
  runPythonScript
};
