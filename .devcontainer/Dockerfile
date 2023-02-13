ARG VARIANT="bullseye"
FROM mcr.microsoft.com/vscode/devcontainers/base:0-${VARIANT}

# Install MongoDB command line tools - though mongo-database-tools not available on arm64
ARG MONGO_TOOLS_VERSION=6.0
RUN . /etc/os-release \
    && apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install -y build-essential nodejs npm\
    && apt-get clean -y && rm -rf /var/lib/apt/lists/*

USER vscode

# Install rustup
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

# Install useful cargo tools
RUN . "$HOME/.cargo/env" &&\
    cargo install \
    cargo-add

# [Optional] Uncomment this section to install additional OS packages.
# RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
#     && apt-get -y install --no-install-recommends <your-package-list-here>

# [Optional] Uncomment if you want to install an additional version of node using nvm
# ARG EXTRA_NODE_VERSION=10
# RUN su node -c "source /usr/local/share/nvm/nvm.sh && nvm install ${EXTRA_NODE_VERSION}"

# [Optional] Uncomment if you want to install more global node modules
# RUN su node -c "npm install -g <your-package-list-here>"

