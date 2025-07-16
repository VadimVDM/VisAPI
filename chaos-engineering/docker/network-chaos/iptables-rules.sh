#!/bin/bash

# =============================================================================
# Network Chaos Rules for Docker Environment
# =============================================================================

set -euo pipefail

ACTION="${1:-help}"
SERVICE="${2:-}"

show_help() {
    cat << EOF
Network Chaos Rules for Docker Environment

Usage: $0 [ACTION] [SERVICE]

ACTIONS:
  block-redis          Block Redis connections
  block-postgres       Block PostgreSQL connections
  block-external       Block external service connections
  add-latency          Add network latency
  add-packet-loss      Add packet loss
  restore              Restore all network rules
  status               Show current network rules
  help                 Show this help message

SERVICES:
  redis                Redis service (chaos-redis)
  postgres             PostgreSQL service (chaos-postgres)
  external             External services (slack, whatsapp, etc.)

EXAMPLES:
  $0 block-redis
  $0 add-latency redis
  $0 restore
  $0 status
EOF
}

block_redis() {
    echo "Blocking Redis connections..."
    iptables -I OUTPUT -p tcp --dport 6379 -j DROP
    iptables -I OUTPUT -d chaos-redis -j DROP
    echo "Redis connections blocked"
}

block_postgres() {
    echo "Blocking PostgreSQL connections..."
    iptables -I OUTPUT -p tcp --dport 5432 -j DROP
    iptables -I OUTPUT -d chaos-postgres -j DROP
    echo "PostgreSQL connections blocked"
}

block_external() {
    echo "Blocking external service connections..."
    # Block common external services
    iptables -I OUTPUT -p tcp --dport 443 -d hooks.slack.com -j DROP
    iptables -I OUTPUT -p tcp --dport 443 -d api.slack.com -j DROP
    iptables -I OUTPUT -p tcp --dport 443 -d app.chatgptbuilder.io -j DROP
    iptables -I OUTPUT -p tcp --dport 443 -d api.resend.com -j DROP
    echo "External service connections blocked"
}

add_latency() {
    local service="$1"
    echo "Adding network latency for $service..."
    
    # Use tc (traffic control) to add latency
    tc qdisc add dev eth0 root netem delay 500ms
    echo "Network latency added (500ms)"
}

add_packet_loss() {
    local service="$1"
    echo "Adding packet loss for $service..."
    
    # Use tc to add packet loss
    tc qdisc add dev eth0 root netem loss 10%
    echo "Packet loss added (10%)"
}

restore_network() {
    echo "Restoring network rules..."
    
    # Remove iptables rules
    iptables -F OUTPUT 2>/dev/null || true
    
    # Remove traffic control rules
    tc qdisc del dev eth0 root 2>/dev/null || true
    
    echo "Network rules restored"
}

show_status() {
    echo "=== Current Network Rules ==="
    echo
    echo "IPTables OUTPUT rules:"
    iptables -L OUTPUT -n -v || echo "No custom iptables rules"
    echo
    echo "Traffic Control rules:"
    tc qdisc show dev eth0 || echo "No traffic control rules"
    echo
    echo "Active network connections:"
    netstat -tuln | grep -E "(6379|5432|443|80)" || echo "No relevant connections"
}

case "$ACTION" in
    block-redis)
        block_redis
        ;;
    block-postgres)
        block_postgres
        ;;
    block-external)
        block_external
        ;;
    add-latency)
        add_latency "$SERVICE"
        ;;
    add-packet-loss)
        add_packet_loss "$SERVICE"
        ;;
    restore)
        restore_network
        ;;
    status)
        show_status
        ;;
    help|*)
        show_help
        ;;
esac