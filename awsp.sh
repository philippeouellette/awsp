#!/usr/bin/env bash

CACHE_DIR="$HOME/.aws/sso/cache"

check_aws_token() {
  # Check if the cache directory exists
  if [[ ! -d "$CACHE_DIR" ]]; then
    aws sso login
    return
  fi

  # Find the most recent token file in the cache directory
  TOKEN_FILE=$(find "$CACHE_DIR" -type f -name "*.json" -print0 | xargs -0 ls -t | head -n 1)

  # Check if a token file was found
  if [[ -z "$TOKEN_FILE" ]]; then
    aws sso login
    return
  fi

  # Extract the expiration time from the token file
  EXPIRATION_TIME=$(jq -r '.expiresAt' "$TOKEN_FILE")

  # Check if jq was able to extract a valid expiration time
  if [[ -z "$EXPIRATION_TIME" || "$EXPIRATION_TIME" == "null" ]]; then
    aws sso login
    return
  fi

  # Convert expiration time to seconds since epoch
  EXPIRATION_TIME_EPOCH=$(date -d "$EXPIRATION_TIME" +%s)

  # Get current time in seconds since epoch
  CURRENT_TIME_EPOCH=$(date +%s)

  # Check if the token is expired
  if (( EXPIRATION_TIME_EPOCH <= CURRENT_TIME_EPOCH )); then
    aws sso login
  fi
}


AWS_PROFILE="$AWS_PROFILE" awsp_prompt

selected_profile="$(cat ~/.awsp)"

if [ -z "$selected_profile" ]
then
  unset AWS_PROFILE
else
  export AWS_PROFILE="$selected_profile"
fi

check_aws_token
