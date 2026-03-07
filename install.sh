#!/bin/bash
set -e

# ─────────────────────────────────────────────
# 🧱 Bridge for Claude Code — Install Script
# curl -fsSL https://raw.githubusercontent.com/noe-finary/bridge/main/install.sh | bash
# ─────────────────────────────────────────────

BRIDGE_HOME="$HOME/.bridge"
REPO="https://github.com/noe-finary/bridge.git"

# ─── Brand Colors (true color) ───

BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'
ACCENT='\033[38;2;237;112;46m'      # orange #ED702E
SUCCESS='\033[38;2;34;197;94m'      # green #22c55e
WARN='\033[38;2;250;204;21m'        # yellow #facc15
ERROR='\033[38;2;239;68;68m'        # red #ef4444
MUTED='\033[38;2;107;114;128m'      # gray #6b7280
INFO='\033[38;2;245;166;35m'        # light orange #F5A623
WHITE='\033[38;2;243;244;246m'      # near-white #f3f4f6

# ─── Spinner ───

spinner() {
  local pid=$1
  local text=$2
  local frames=("⠋" "⠙" "⠹" "⠸" "⠼" "⠴" "⠦" "⠧" "⠇" "⠏")
  local i=0
  tput civis 2>/dev/null  # hide cursor
  while kill -0 "$pid" 2>/dev/null; do
    printf "\r  ${ACCENT}%s${RESET} %s" "${frames[$((i % 10))]}" "$text"
    i=$((i + 1))
    sleep 0.08
  done
  printf "\r\033[K"
  tput cnorm 2>/dev/null  # show cursor
}

succeed() {
  echo -e "  ${SUCCESS}✓${RESET} $1"
}

fail() {
  echo -e "  ${ERROR}✗${RESET} $1"
}

# ─── Logo ───

echo ""
echo -e "${ACCENT}  ┌──────────────────────────────────────┐${RESET}"
echo -e "${ACCENT}  │${RESET}  🧱 ${BOLD}Bridge for Claude Code${RESET}             ${ACCENT}│${RESET}"
echo -e "${ACCENT}  │${RESET}${MUTED}     Design in Figma from your terminal  ${RESET}${ACCENT}│${RESET}"
echo -e "${ACCENT}  └──────────────────────────────────────┘${RESET}"
echo ""

# ─── Check prerequisites ───

check_command() {
  if ! command -v "$1" &> /dev/null; then
    fail "$1 is required but not installed."
    echo -e "    ${MUTED}Install it: $2${RESET}"
    exit 1
  fi
}

check_command "node" "https://nodejs.org"
check_command "git" "https://git-scm.com"
check_command "jq" "brew install jq / apt install jq"

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  fail "Node.js 18+ required (found v$(node -v))"
  exit 1
fi

succeed "Prerequisites ${MUTED}node $(node -v), git, jq${RESET}"

# ─── Install ───

if [ -d "$BRIDGE_HOME" ]; then
  (git -C "$BRIDGE_HOME" pull --quiet origin main) &
  spinner $! "Updating existing installation..."
  succeed "Updated ${MUTED}$BRIDGE_HOME${RESET}"
else
  (git clone --quiet "$REPO" "$BRIDGE_HOME") &
  spinner $! "Cloning to $BRIDGE_HOME..."
  succeed "Installed to ${MUTED}$BRIDGE_HOME${RESET}"
fi

# Install server dependencies
(npm install --prefix "$BRIDGE_HOME/server" --silent 2>/dev/null) &
spinner $! "Installing dependencies..."
succeed "Dependencies installed"

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
      echo "# 🧱 Bridge for Claude Code" >> "$shell_rc"
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

succeed "${BOLD}bridge${RESET} command added to PATH"

# ─── Done ───

echo ""
echo -e "${ACCENT}  ┌──────────────────────────────────────┐${RESET}"
echo -e "${ACCENT}  │${RESET}  🧱 ${SUCCESS}${BOLD}Installed!${RESET}                         ${ACCENT}│${RESET}"
echo -e "${ACCENT}  │${RESET}                                      ${ACCENT}│${RESET}"
echo -e "${ACCENT}  │${RESET}  ${WHITE}cd your-project${RESET}                      ${ACCENT}│${RESET}"
echo -e "${ACCENT}  │${RESET}  ${WHITE}bridge init${RESET}                          ${ACCENT}│${RESET}"
echo -e "${ACCENT}  │${RESET}                                      ${ACCENT}│${RESET}"
echo -e "${ACCENT}  └──────────────────────────────────────┘${RESET}"

if [ "$PATH_ADDED" = true ]; then
  echo ""
  echo -e "  ${MUTED}Restart your terminal or run:${RESET}"
  echo -e "  ${ACCENT}source ~/.zshrc${RESET}  ${MUTED}(or ~/.bashrc)${RESET}"
fi

echo ""
