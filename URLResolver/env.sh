#!/bin/zsh
##### CHANGE IT ACCORDING TO YOUR CURRENT SHELL
export LISTEN_PORT=3000
export DOWNLOAD_WINDOW_TIME=3600 ####IN SECONDS
export GOOGLE_APPLICATION_CREDENTIALS=/Users/julianrichie/Projects/FileIsMoney/fileismoney-fbase.json
export QUERY_BLOCKCHAIN=true;


##### DONT FORGET TO REMOVE localhost from the list for production site
##### testnet.app.file.money and app.file.money required for Test Download Function on the Browser
##### the Test Download Function itself is using XHR on Browser
export CORS_ORIGIN="https://testnet.app.file.money,https://app.file.money,http://localhost:4222"


##### TESTNET CONTRACT ADDRESS MAY CHANGE DURING THE TIME; MAKE SURE TO ALWAYS CHECK ON THE WEBSITE
export CONTRACT_ADDRESS="0x26CC8DCA0229E4abEefF118601C97d54b7E31fde";

##### MAINNET CONTRACT ADDRESS
# export CONTRACT_ADDRESS="";