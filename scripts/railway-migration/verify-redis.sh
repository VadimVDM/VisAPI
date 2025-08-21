#!/bin/bash
# verify-redis.sh - Redis migration verification script

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "Redis Migration Verification"
echo "========================================="
echo ""

# Check if Redis URLs are provided
if [ -z "$UPSTASH_REDIS_URL" ]; then
    echo -e "${RED}Error: UPSTASH_REDIS_URL not set${NC}"
    echo "Please set: export UPSTASH_REDIS_URL='rediss://...'"
    exit 1
fi

if [ -z "$RAILWAY_REDIS_URL" ]; then
    echo -e "${RED}Error: RAILWAY_REDIS_URL not set${NC}"
    echo "Please set: export RAILWAY_REDIS_URL='redis://...'"
    exit 1
fi

echo "Upstash URL: ${UPSTASH_REDIS_URL:0:20}..."
echo "Railway URL: ${RAILWAY_REDIS_URL:0:20}..."
echo ""

# Function to safely get queue length
get_queue_length() {
    local redis_url=$1
    local queue_name=$2
    local result=$(redis-cli -u "$redis_url" llen "queue:$queue_name" 2>/dev/null || echo "error")
    echo "$result"
}

# Function to safely get key count
get_key_count() {
    local redis_url=$1
    local pattern=$2
    local result=$(redis-cli -u "$redis_url" --scan --pattern "$pattern" 2>/dev/null | wc -l || echo "error")
    echo "$result"
}

# 1. Check Queue Counts
echo "1. Queue Comparison"
echo "-------------------"
echo "Queue Name        | Upstash | Railway | Status"
echo "------------------|---------|---------|--------"

queues=("critical" "default" "bulk" "slack" "whatsapp" "pdf" "cgb-sync" "dlq")
total_upstash=0
total_railway=0
queues_match=true

for queue in "${queues[@]}"; do
    upstash_count=$(get_queue_length "$UPSTASH_REDIS_URL" "$queue")
    railway_count=$(get_queue_length "$RAILWAY_REDIS_URL" "$queue")
    
    # Handle errors
    if [ "$upstash_count" == "error" ]; then
        upstash_count="N/A"
    else
        total_upstash=$((total_upstash + upstash_count))
    fi
    
    if [ "$railway_count" == "error" ]; then
        railway_count="N/A"
    else
        total_railway=$((total_railway + railway_count))
    fi
    
    # Determine status
    if [ "$upstash_count" == "$railway_count" ]; then
        status="${GREEN}✓${NC}"
    else
        status="${YELLOW}⚠${NC}"
        queues_match=false
    fi
    
    printf "%-17s | %7s | %7s | %s\n" "$queue" "$upstash_count" "$railway_count" "$status"
done

echo "------------------|---------|---------|--------"
printf "%-17s | %7s | %7s |\n" "TOTAL" "$total_upstash" "$total_railway"

# 2. Check Key Patterns
echo ""
echo "2. Key Pattern Comparison"
echo "-------------------------"
echo "Pattern           | Upstash | Railway | Status"
echo "------------------|---------|---------|--------"

patterns=("bull:*" "idempotency:*" "rate-limit:*" "session:*")

for pattern in "${patterns[@]}"; do
    upstash_keys=$(get_key_count "$UPSTASH_REDIS_URL" "$pattern")
    railway_keys=$(get_key_count "$RAILWAY_REDIS_URL" "$pattern")
    
    # Handle errors
    if [ "$upstash_keys" == "error" ]; then
        upstash_keys="N/A"
    fi
    
    if [ "$railway_keys" == "error" ]; then
        railway_keys="N/A"
    fi
    
    # Determine status
    if [ "$upstash_keys" == "$railway_keys" ]; then
        status="${GREEN}✓${NC}"
    else
        status="${YELLOW}⚠${NC}"
    fi
    
    printf "%-17s | %7s | %7s | %s\n" "$pattern" "$upstash_keys" "$railway_keys" "$status"
done

# 3. Database Size
echo ""
echo "3. Database Size"
echo "----------------"
upstash_dbsize=$(redis-cli -u "$UPSTASH_REDIS_URL" dbsize 2>/dev/null | grep -o '[0-9]*' || echo "N/A")
railway_dbsize=$(redis-cli -u "$RAILWAY_REDIS_URL" dbsize 2>/dev/null | grep -o '[0-9]*' || echo "N/A")

echo "Upstash total keys: $upstash_dbsize"
echo "Railway total keys: $railway_dbsize"

if [ "$upstash_dbsize" != "N/A" ] && [ "$railway_dbsize" != "N/A" ]; then
    if [ "$upstash_dbsize" -eq "$railway_dbsize" ]; then
        echo -e "${GREEN}✓${NC} Database sizes match"
    else
        diff=$((upstash_dbsize - railway_dbsize))
        echo -e "${YELLOW}⚠${NC} Difference of $diff keys"
    fi
fi

# 4. Connection Test
echo ""
echo "4. Connection Test"
echo "------------------"
echo -n "Testing Upstash connection... "
upstash_ping=$(redis-cli -u "$UPSTASH_REDIS_URL" ping 2>/dev/null)
if [ "$upstash_ping" == "PONG" ]; then
    echo -e "${GREEN}✓${NC} Connected"
else
    echo -e "${RED}✗${NC} Failed"
fi

echo -n "Testing Railway connection... "
railway_ping=$(redis-cli -u "$RAILWAY_REDIS_URL" ping 2>/dev/null)
if [ "$railway_ping" == "PONG" ]; then
    echo -e "${GREEN}✓${NC} Connected"
else
    echo -e "${RED}✗${NC} Failed"
fi

# 5. Sample Data Verification
echo ""
echo "5. Sample Data Verification"
echo "---------------------------"
echo "Checking for critical data patterns..."

# Check for BullMQ meta keys
echo -n "BullMQ meta keys... "
upstash_bull_meta=$(redis-cli -u "$UPSTASH_REDIS_URL" exists bull:queue:default:meta 2>/dev/null || echo "error")
railway_bull_meta=$(redis-cli -u "$RAILWAY_REDIS_URL" exists bull:queue:default:meta 2>/dev/null || echo "error")

if [ "$upstash_bull_meta" == "$railway_bull_meta" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠${NC} Mismatch"
fi

# Summary
echo ""
echo "========================================="
echo "Migration Verification Summary"
echo "========================================="

migration_ready=true

if [ "$queues_match" = false ]; then
    echo -e "${YELLOW}⚠${NC} Queue counts differ - verify ongoing processing"
    migration_ready=false
else
    echo -e "${GREEN}✓${NC} Queue counts match"
fi

if [ "$upstash_dbsize" == "$railway_dbsize" ]; then
    echo -e "${GREEN}✓${NC} Database sizes match"
else
    echo -e "${YELLOW}⚠${NC} Database sizes differ"
    migration_ready=false
fi

if [ "$railway_ping" == "PONG" ]; then
    echo -e "${GREEN}✓${NC} Railway Redis is accessible"
else
    echo -e "${RED}✗${NC} Railway Redis connection failed"
    migration_ready=false
fi

echo ""
if [ "$migration_ready" = true ]; then
    echo -e "${GREEN}✅ Redis migration verified successfully${NC}"
    echo "Note: Small differences in queue counts are normal due to ongoing processing"
else
    echo -e "${YELLOW}⚠️ Redis migration needs attention${NC}"
    echo "Review the differences above before proceeding"
fi