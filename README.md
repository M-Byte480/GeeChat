# GeeChat - The VoiceChat for Gamers

## Contributing

By contributing to GeeChat you agree to the [Contributor License Agreement](CLA.md).
This project is licensed under the [AGPL v3](LICENSE).

## With privacy as a priority.

GeeChat is a voice chat application designed specifically for gamers, with a strong emphasis on privacy. It allows
gamers to voice chat and text chat with their friends. The system is decentralized authenticity

### To run a dev Electron

1. Install Yarn Globally
2. chat4gamers/packages -> yarn install
3. chat4gamers/server -> yarn install -> yarn dev
4. chat4gamers/apps/next -> yarn install -> yarn dev + yarn electron

You have a local server, local react and local next backend running.

## The flow:

1. User creates an Identity-File with a password. This file contains the user's private key
2. The user can then use this Identity-File to log in to the application. The private key is used to authenticate the
   user and to encrypt/decrypt messages.
3. User must add Address to server to be able to connect to server
    - If the user joins via server-address, the user is in a lobby state for said server-host.
    - If the user joins via invite-link, the user automatically joins the lobby of the server-host.
4. Users are able to chat with each other in the server
    - Alongside voice chat.
    - There will be roles and permissions to manage the server.
        - Upon first deployment of the server, a password will be generated. This password is used to create the first
          admin account.

### User is trying to login to a new device:

1. The Identity-File must be available and transferred to the new device.
2. The user must import the Identity-File and enter the password to access their account.
    - The Identity-File also stores the user's server addresses and other settings, so the user can easily access their
      servers without having to re-enter the information.

