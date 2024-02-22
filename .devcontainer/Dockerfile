FROM mcr.microsoft.com/devcontainers/typescript-node:1-20-bullseye

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libgbm-dev \
    libgconf-2-4 \
    libgdk-pixbuf2.0-0 \
    libgtk-3-0 \
    libnss3 \
    libnss3-dev \
    libxss-dev \
    libasound2 \
    dbus \
    xvfb \
 && rm -rf /var/lib/apt/lists/*

# # Create non-root user
# # Reference: https://aka.ms/vscode-remote/containers/non-root#_creating-a-nonroot-user
# ARG USERNAME=vscode
# ARG USER_UID=1000
# ARG USER_GID=$USER_UID

# # Create the user
# RUN groupadd --gid $USER_GID $USERNAME \
#     && useradd --uid $USER_UID --gid $USER_GID -m $USERNAME \
#     #
#     # [Optional] Add sudo support. Omit if you don't need to install software after connecting.
#     && apt-get update \
#     && apt-get install -y sudo \
#     && echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
#     && chmod 0440 /etc/sudoers.d/$USERNAME

# # ********************************************************
# # * Anything else you want to do like clean up goes here *
# # ********************************************************

# # [Optional] Set the default user. Omit if you want to keep the default as root.
# USER $USERNAME
