import sys
import json
import os
from pathlib import Path

# Add the backend root to the Python path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import asyncio
from app.agents.intent_router import rules_route, Intent

async def run_tests_async():
    test_file = Path(__file__).resolve().parent.parent / "tests" / "router_cases.json"
    with open(test_file, "r", encoding="utf-8") as f:
        cases = json.load(f)
    
    total = len(cases)
    matched = 0
    missed = []
    
    print(f"Running rules-only routing tests for {total} cases...\n")
    
    for case in cases:
        msg = case["message"]
        expected = set(case["expected"])
        
        result = rules_route(msg)
        
        if result and not result.needs_clarification:
            actual = set([i.value for i in result.intents])
        elif result and result.needs_clarification:
            actual = {"unclear"}
        else:
            actual = set()
            
        if expected == actual or (len(expected) > 1 and actual and actual.issubset(expected)):
            matched += 1
        else:
            # Special case for out_of_scope which might be classified as unclear if safety net triggered
            if "out_of_scope" in expected and "unclear" in actual:
                matched += 1
            else:
                missed.append({
                    "message": msg,
                    "expected": list(expected),
                    "actual": list(actual),
                    "source": result.source if result else "none"
                })
            
    print(f"Accuracy: {matched}/{total} ({(matched/total)*100:.1f}%)\n")
    if missed:
        print("Missed Cases:")
        for m in missed:
            print(f"- '{m['message']}'\n  Expected: {m['expected']}\n  Actual: {m['actual']}\n  Source: {m['source']}\n")

def run_tests():
    asyncio.run(run_tests_async())

if __name__ == "__main__":
    run_tests()
