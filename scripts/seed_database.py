"""
Rentora - Master Database Seeder
Runs all modular seeding steps (catalog appliances, packages, premium inventory, feedback & support).
"""
import os
import sys
import subprocess

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPTS_DIR)
SEEDERS_DIR = os.path.join(PROJECT_ROOT, "archive", "scripts", "seeders")

def run_script(script_name):
    script_path = os.path.join(SEEDERS_DIR, script_name)
    if not os.path.exists(script_path):
        script_path = os.path.join(SCRIPTS_DIR, script_name)
    
    if not os.path.exists(script_path):
        print(f"[SKIP] {script_name} not found.")
        return False
        
    print(f"\n---> Running {script_name}...")
    result = subprocess.run([sys.executable, script_path], cwd=PROJECT_ROOT)
    return result.returncode == 0

def main():
    print("=" * 60)
    print("  RENTORA MASTER DATABASE SEEDER")
    print("=" * 60)
    
    seed_steps = [
        "seed_appliances.py",
        "seed_expand_catalog.py",
        "seed_more_catalog.py",
        "seed_packages.py",
        "seed_premium_catalog.py",
        "seed_feedback_and_support.py",
    ]
    
    success_count = 0
    for step in seed_steps:
        if run_script(step):
            success_count += 1
            
    print("\n" + "=" * 60)
    print(f"  SEEDING COMPLETE ({success_count}/{len(seed_steps)} steps successful)")
    print("=" * 60)

if __name__ == "__main__":
    main()

