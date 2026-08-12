---
title: "Base64 Is Not Encryption, and Decoding a JWT Is Not Verifying It"
description: "Two things everyone learns the hard way: a Kubernetes secret is plain text with extra steps, and a decoded token tells you what it claims, not whether any of it is true."
pubDate: 2026-08-12
tags:
  - "security"
---

Two misunderstandings cause a surprising amount of damage, and both come from the same instinct — treating an encoding as a security control.

## A Kubernetes secret is not secret

Run this and look at what comes back:

```bash
kubectl get secret db-credentials -o yaml
```

```yaml
apiVersion: v1
kind: Secret
data:
  password: c3VwZXItc2VjcmV0LXBhc3N3b3Jk
  username: YWRtaW4=
```

That looks protected. It is not. Base64 is a *transport* encoding — a way to carry arbitrary bytes through a channel that only reliably handles text. It has no key, so anyone can reverse it:

```bash
echo c3VwZXItc2VjcmV0LXBhc3N3b3Jk | base64 -d
# super-secret-password
```

Kubernetes uses base64 in the manifest because secret values are arbitrary bytes and YAML is text. That is the entire reason. The protection comes from RBAC controlling who can call `get secret`, and from encryption at rest if you configured it — never from the encoding.

The practical consequences:

- **A secret manifest in Git is a plaintext credential in Git.** Committing it is the same as committing the password. Tools like SOPS or Sealed Secrets exist precisely to close this gap.
- **`kubectl describe` hides values, `get -o yaml` does not.** Be careful which one you run while screen-sharing.
- **Anyone who can read secrets in a namespace can read every credential in it.** That is an RBAC design question, and it is worth actually answering.

Base64 is also mildly awkward in ways worth knowing. It inflates data by about a third. It has a URL-safe variant ([RFC 4648](https://www.rfc-editor.org/rfc/rfc4648)) that swaps `+` and `/` for `-` and `_`, which is what appears in JWTs and query strings. And plain `echo` appends a newline that ends up inside your encoded value:

```bash
# Wrong — encodes a trailing newline
echo "super-secret-password" | base64

# Right
printf '%s' "super-secret-password" | base64
```

That trailing newline has caused more failed database logins than anyone would like to admit.

## A JWT is signed, not sealed

A JSON Web Token looks like an opaque blob:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0Iiwicm9sZSI6ImFkbWluIn0.dBjftJeZ4CVP...
```

It is three base64url segments joined by dots: **header**, **payload**, **signature**. The first two are just encoded JSON. Anyone holding the token can read them — no key required:

```bash
echo 'eyJzdWIiOiIxMjM0Iiwicm9sZSI6ImFkbWluIn0' | base64 -d
# {"sub":"1234","role":"admin"}
```

So the payload of a JWT is readable by the user it was issued to, by any browser extension that can see it, and by anything that logged it along the way. **Never put anything in a JWT you would not show the bearer.** Internal user IDs are fine. Email addresses are a judgement call. A password reset token, someone's plan tier you would rather they not see, or an internal hostname are not.

The signature is the part that matters, and it proves exactly one thing: that whoever created the token held the signing key, and that the header and payload have not changed since. It says nothing about whether the token is still valid — that is your job:

- **`exp`** — has it expired? Check it against the current time, and remember it is in seconds since the epoch, not milliseconds. Mixing those up produces tokens that expire in 1970 or in the year 56000.
- **`nbf`** — is it valid yet?
- **`iss` and `aud`** — was it issued by the party you trust, for the audience you are? A perfectly valid token from a different tenant is still a valid signature.

And the trap that has burned real systems: **`alg: none`**. Early JWT libraries would honour a header claiming the token was unsigned, and accept it. An attacker takes a valid token, edits `"role":"user"` to `"role":"admin"`, sets the algorithm to `none`, drops the signature, and gets in. A related attack flips `RS256` to `HS256` so that the public key — which the attacker has — is used as the HMAC secret.

The defence is the same in both cases: never let the token tell you how to verify it. Pin the expected algorithm in your verification call, and reject anything else.

```python
# Wrong — trusts the token's own header
jwt.decode(token, key, algorithms=None)

# Right
jwt.decode(token, key, algorithms=["RS256"], audience="my-api", issuer="https://idp.example.com")
```

## Where you paste things matters

All of which leads somewhere practical. When you paste a JWT into a website to see what is inside, you have handed that site a working credential. If it has not expired, whoever operates that site can use it. The same is true of the base64 blob out of a secret manifest, and of the YAML you were converting.

This is not hypothetical caution — it is the reason these tools should do their work locally. Anything that can run in the browser has no business making a network request with your data.

The tools on this site work that way:

- [Base64 encoder and decoder](/tools/base64) — handles UTF-8 correctly, so emoji and non-Latin scripts survive the round trip, and does URL-safe output for JWT segments.
- [JWT decoder](/tools/jwt-decoder) — shows the header and claims with timestamps rendered as readable dates and a live expiry check. It decodes only. It does not verify the signature, because doing that in a browser would require your signing key, and a page has no business asking for one.
- [YAML ↔ JSON converter](/tools/yaml-json) — for the manifest the secret came out of.

Everything happens in the tab. Nothing is uploaded, logged or stored — which is a claim worth being able to make about any tool you hand a credential to.
