# Zelnando WhatsApp Integration

Zelnando is WhatsApp-first. The website should only explain the product and open WhatsApp. Customer actions should happen inside the WhatsApp conversation.

## Important limitation

A normal personal WhatsApp number cannot run an automated bot webhook. It can receive the prefilled messages from the website, but automated replies require a WhatsApp Business Platform / Cloud API phone number connected in Meta.

Use your personal number for handoff testing. Use a Meta WhatsApp Business number for the real bot.

## Frontend handoff

All buttons with `class="whatsapp-link"` open:

```text
https://api.whatsapp.com/send?phone=<ZELNANDO_WHATSAPP_NUMBER>&text=<prefilled command>
```

Update the number in `script.js`:

```js
const ZELNANDO_WHATSAPP_NUMBER = "50900000000";
```

Replace it with your official WhatsApp Business phone number in international format without `+`.

## Cloud API webhook

`whatsapp-cloud-webhook.js` is a dependency-free Node webhook scaffold for Meta WhatsApp Cloud API.

Run locally:

```bash
set WHATSAPP_VERIFY_TOKEN=zelnando_verify_token
set WHATSAPP_ACCESS_TOKEN=<meta_access_token>
set WHATSAPP_PHONE_NUMBER_ID=<meta_phone_number_id>
node whatsapp-cloud-webhook.js
```

Meta webhook callback URL:

```text
https://your-domain.com/webhook
```

Verify token:

```text
zelnando_verify_token
```

## Bot-first commands

Recommended initial commands:

- `get started`
- `personal account`
- `business account`
- `send 2500 HTG to Mama Nadine`
- `track my transfer`
- `contact support`
- `rates`

## Local bot test

You can test the conversation logic before connecting Meta:

```bash
node test-zelnando-bot.js
```

Example test:

```text
You > 1
You > verify me
You > send money
You > Send 2500 HTG to Mama Nadine
You > 1234
```

Expected result:

- onboarding starts
- KYC is marked verified for demo
- transfer quote appears
- 4-digit PIN approves the transfer
- receipt is generated

## Product rule

AI can interpret messages, explain next steps, and collect missing details. It should not approve money movement. Final approval belongs to backend rules: KYC, PIN hash, recipient validation, limits, AML checks, ledger write, and payout route.
