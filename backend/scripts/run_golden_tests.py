"""
Runs the 20 golden questions against find_evidence() and outputs a report.

Usage (from backend/):
  py -m scripts.run_golden_tests
"""
import asyncio
import json
import time
from pathlib import Path

from app.services.evidence_service import find_evidence, ABSTAIN_RESULT

async def main():
    q_file = Path("tests/golden_questions.json")
    if not q_file.exists():
        print(f"Error: {q_file} not found.")
        return
    
    with open(q_file, "r") as f:
        data = json.load(f)
    
    questions = data.get("questions", [])
    if not questions:
        print("No questions found.")
        return
    
    print(f"Running {len(questions)} golden tests...")
    
    passed = 0
    failed = 0
    abstains = 0
    
    start_time = time.time()
    
    for i, q in enumerate(questions):
        print(f"\n[{i+1}/{len(questions)}] Q: {q['question']}")
        
        # We use a demo case code "MED-82031" to trigger the demo policy dataset
        result = await find_evidence(
            question=q["question"],
            case_id="demo-test",
            case_code="MED-82031",
            language=q["language"],
        )
        
        if result is ABSTAIN_RESULT:
            if q["should_abstain"]:
                print("  ✅ Passed (correctly abstained)")
                passed += 1
                abstains += 1
            else:
                print("  ❌ Failed (abstained, but shouldn't have)")
                failed += 1
            continue
        
        # It returned an answer.
        if q["should_abstain"]:
            print(f"  ❌ Failed (should have abstained, but answered): {result.answer[:50]}...")
            failed += 1
            continue
        
        # Check keyword in quote or answer
        keyword = q["expected_keyword"].lower()
        if keyword in result.quote.lower() or keyword in result.answer.lower():
            # Check page number if expected
            if q.get("expected_page") is not None:
                if result.page_number == q["expected_page"]:
                    print(f"  ✅ Passed (found keyword '{keyword}' on correct page {result.page_number})")
                    passed += 1
                else:
                    print(f"  ❌ Failed (found keyword, but wrong page. Expected {q['expected_page']}, got {result.page_number})")
                    print(f"     Source: {result.document_name} | Quote: {result.quote}")
                    failed += 1
            else:
                print(f"  ✅ Passed (found keyword '{keyword}')")
                passed += 1
        else:
            print(f"  ❌ Failed (missing keyword '{keyword}')")
            print(f"     Answer: {result.answer}")
            print(f"     Quote: {result.quote}")
            failed += 1

    elapsed = time.time() - start_time
    print(f"\n=== Test Run Complete in {elapsed:.1f}s ===")
    print(f"Total: {len(questions)}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Abstained: {abstains}")
    
    if failed == 0:
        print("\n🎉 ALL TESTS PASSED!")
    else:
        print("\n⚠️ SOME TESTS FAILED.")

if __name__ == "__main__":
    asyncio.run(main())
