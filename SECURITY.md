# Security policy

## Reporting a vulnerability

Report security problems privately through GitHub: open this repository's **Security** tab and choose **Report a vulnerability**, or go straight to https://github.com/memorex386/bradthome/security/advisories/new. Please don't open a public issue.

Include what you found, how to reproduce it, and what it affects. You'll get a reply as soon as possible. There's no bug bounty.

## Scope

In scope:

- bradthome.com, also served at bradthome.web.app and bradthome.firebaseapp.com. Until v1.0 replaces it, the live site is v0, a prototype that isn't built from this repository. Report problems in it here too.
- The code in this repository.
- Secrets or private details exposed anywhere in this repository or its history.
- How this site configures the services it uses, such as GitHub, Firebase and Google Cloud.

Out of scope:

- Problems in those services themselves. Report those to the service.
- Denial-of-service attacks, spam and social engineering.
- Missing security headers and other findings with no demonstrated impact, and raw scanner output.
- The domain's email settings, such as SPF and DMARC.

## Supported versions

Fixes go to the live site. From v1.0 on, that's the site built from the `main` branch.
