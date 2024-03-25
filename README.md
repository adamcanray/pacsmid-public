## Temporary

### Encrypt and decrypt text

1. post to `/user/req-login` with body:
   ```
   {
       "method": "email",
       "userId": "apaini1@yopmail.com"
   }
   ```
2. post to `/user/login` with body:
   ```
    {
        "foreignId": "001",
        "type": "user",
        "otpCode": "<form-email>",
        "otpMethodId": "<from-req-login-response>"
    }
   ```
3. post to `/user/enc-dec` with body:
   ```
    {
        userSessionSigs: "<from-login-response>"
    }
   ```
   currently, this will return error:
   ```
   {
        message: 'Wallet Signature not in JSON format',
        errorCode: 'NodeWalletSignatureJSONError',
        errorKind: 'Parser',
        status: 502,
        details: [
            'parser error: Signed session key does not match the one we verified above',
            'Signed session key does not match the one we verified above'
        ],
        requestId: '26dd63928586a'
   }
   ```
