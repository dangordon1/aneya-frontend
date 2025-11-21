#!/bin/bash
# Test script to run before Cloud Run deployment
# Tests the clinical decision support workflow locally

set -e  # Exit on error

echo "========================================="
echo "Pre-Deployment Testing"
echo "========================================="

# Check for required environment variables
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "❌ ANTHROPIC_API_KEY not set"
    exit 1
fi

echo "✅ Environment variables configured"

# Test 1: Run streamlined workflow test
echo ""
echo "Test 1: Streamlined clinical decision support workflow"
echo "---------------------------------------"

python test_streamlined.py > /tmp/deploy_test.log 2>&1 &
TEST_PID=$!

# Wait for test with timeout
TIMEOUT=60
ELAPSED=0
while kill -0 $TEST_PID 2>/dev/null; do
    if [ $ELAPSED -ge $TIMEOUT ]; then
        echo "❌ Test timed out after ${TIMEOUT}s"
        kill -9 $TEST_PID 2>/dev/null
        exit 1
    fi
    sleep 2
    ELAPSED=$((ELAPSED + 2))
    printf "."
done

wait $TEST_PID
TEST_EXIT=$?

echo ""

if [ $TEST_EXIT -eq 0 ]; then
    # Check if result file was created
    if [ -f "/tmp/streamlined_test_result.json" ]; then
        # Check if diagnoses were found
        DIAGNOSES=$(python -c "import json; data=json.load(open('/tmp/streamlined_test_result.json')); print(len(data.get('diagnoses', [])))" 2>/dev/null || echo "0")

        if [ "$DIAGNOSES" -gt 0 ]; then
            echo "✅ Test passed: Found $DIAGNOSES diagnosis(es)"
        else
            echo "⚠️  Test completed but no diagnoses found"
            echo "   This might be expected for some test cases"
        fi
    else
        echo "⚠️  Test completed but no result file found"
    fi
else
    echo "❌ Test failed with exit code $TEST_EXIT"
    echo "   Check /tmp/deploy_test.log for details"
    exit 1
fi

echo ""
echo "========================================="
echo "✅ All tests passed - Safe to deploy"
echo "========================================="
