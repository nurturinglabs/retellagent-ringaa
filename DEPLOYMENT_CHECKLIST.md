# Deployment Checklist — Ringaa (Retell Version)

## Pre-Deployment
- [ ] All code committed to git
- [ ] `npm run build` succeeds with no errors
- [ ] No console errors in dev mode
- [ ] Environment variables documented in `.env.example`
- [ ] README.md is complete
- [ ] TEST_CHECKLIST.md items pass

## Vercel Deployment
- [ ] Connect GitHub repo to Vercel
- [ ] Set environment variables in Vercel dashboard:
  - `RETELL_API_KEY`
  - `RETELL_AGENT_ID`
  - `RETELL_PHONE_NUMBER_ID`
  - `RESEND_API_KEY`
  - `NEXT_PUBLIC_APP_URL` (set to production URL)
  - `NEXT_PUBLIC_RINGAA_PHONE` (set to display number)
- [ ] Deploy main branch
- [ ] Verify deployed URL loads correctly

## Retell Configuration
- [ ] Agent ID matches Vercel env variable
- [ ] Phone number ID matches Vercel env variable
- [ ] Webhook URL set in Retell dashboard:
  ```
  https://your-domain.vercel.app/api/webhooks/retell
  ```
- [ ] Test webhook delivery from Retell dashboard
- [ ] Agent tools point to production API URLs:
  - `https://your-domain.vercel.app/api/check-seats`
  - `https://your-domain.vercel.app/api/book-visit`
  - `https://your-domain.vercel.app/api/start-application`

## Post-Deployment
- [ ] Call the live phone number
- [ ] Verify AI agent responds correctly
- [ ] Check that lead is created after call
- [ ] Verify dashboard shows new call data
- [ ] Check Retell dashboard for call logs
- [ ] Monitor Vercel logs for errors
- [ ] Test follow-up email sending
