#!/bin/bash
set -e

# ─────────────────────────────────────────────
# Bridge for Claude Code — Install Script
# curl -fsSL https://raw.githubusercontent.com/noe-finary/bridge/main/install.sh | bash
# ─────────────────────────────────────────────

BRIDGE_HOME="$HOME/.bridge"
REPO="https://github.com/noe-finary/bridge.git"

# Colors
BOLD='\033[1m'
DIM='\033[2m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
RESET='\033[0m'

echo ""
echo -e "${BOLD}  Bridge for Claude Code${RESET}"
echo -e "${DIM}  Design in Figma from your terminal${RESET}"
echo ""

# ─── Check prerequisites ───

check_command() {
  if ! command -v "$1" &> /dev/null; then
    echo -e "  ${RED}✗${RESET} $1 is required but not installed."
    echo -e "    Install it: $2"
    exit 1
  fi
}

check_command "node" "https://nodejs.org"
check_command "git" "https://git-scm.com"
check_command "jq" "brew install jq / apt install jq"

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "  ${RED}✗${RESET} Node.js 18+ required (found v$(node -v))"
  exit 1
fi

echo -e "  ${GREEN}✓${RESET} Prerequisites OK (node $(node -v), git, jq)"

# ─── Install ───

if [ -d "$BRIDGE_HOME" ]; then
  echo -e "  ${YELLOW}→${RESET} Updating existing installation..."
  git -C "$BRIDGE_HOME" pull --quiet origin main
else
  echo -e "  ${YELLOW}→${RESET} Installing to $BRIDGE_HOME..."
  git clone --quiet "$REPO" "$BRIDGE_HOME"
fi

# Install server dependencies
echo -e "  ${YELLOW}→${RESET} Installing dependencies..."
npm install --prefix "$BRIDGE_HOME/server" --silent 2>/dev/null

# ─── Create CLI ───

BRIDGE_BIN="$BRIDGE_HOME/bin"
mkdir -p "$BRIDGE_BIN"

cat > "$BRIDGE_BIN/bridge" << 'BRIDGE_CLI'
#!/bin/bash
BRIDGE_HOME="$HOME/.bridge"
exec node "$BRIDGE_HOME/cli/bridge.js" "$@"
BRIDGE_CLI

chmod +x "$BRIDGE_BIN/bridge"

# ─── Add to PATH ───

add_to_path() {
  local shell_rc="$1"
  local path_line="export PATH=\"\$HOME/.bridge/bin:\$PATH\""

  if [ -f "$shell_rc" ]; then
    if ! grep -q ".bridge/bin" "$shell_rc"; then
      echo "" >> "$shell_rc"
      echo "# Bridge for Claude Code" >> "$shell_rc"
      echo "$path_line" >> "$shell_rc"
      return 0
    fi
  fi
  return 1
}

PATH_ADDED=false

# Detect shell and add to appropriate rc file
if [ -n "$ZSH_VERSION" ] || [ "$SHELL" = "/bin/zsh" ]; then
  if add_to_path "$HOME/.zshrc"; then PATH_ADDED=true; fi
elif [ -n "$BASH_VERSION" ] || [ "$SHELL" = "/bin/bash" ]; then
  if add_to_path "$HOME/.bashrc"; then PATH_ADDED=true; fi
  if add_to_path "$HOME/.bash_profile"; then PATH_ADDED=true; fi
fi

# Also try .profile as fallback
if [ "$PATH_ADDED" = false ]; then
  add_to_path "$HOME/.profile" && PATH_ADDED=true
fi

# Add to current session
export PATH="$BRIDGE_BIN:$PATH"

echo ""
echo -e "  ${GREEN}✓${RESET} Bridge installed to $BRIDGE_HOME"
echo -e "  ${GREEN}✓${RESET} ${BOLD}bridge${RESET} command added to PATH"

if [ "$PATH_ADDED" = true ]; then
  echo ""
  echo -e "  ${DIM}Restart your terminal or run:${RESET}"
  echo -e "  ${CYAN}source ~/.zshrc${RESET}  ${DIM}(or ~/.bashrc)${RESET}"
fi

echo ""
echo -e "  ${BOLD}Next steps:${RESET}"
echo -e "  ${CYAN}cd your-project${RESET}"
echo -e "  ${CYAN}bridge init${RESET}"
echo ""
