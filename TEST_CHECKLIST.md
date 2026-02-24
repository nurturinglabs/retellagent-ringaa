# Test Checklist — Ringaa (Retell Version)

## 1. Build & Start
- [ ] `npm install` completes with no errors
- [ ] `npm run dev` starts server on port 3000
- [ ] `npm run build` completes with no TypeScript errors
- [ ] No ElevenLabs references in codebase

## 2. Landing Page (/)
- [ ] Phone number displays correctly (+1 (262) 384-6288)
- [ ] "Call Now" button links to `tel:` URI
- [ ] "Powered by Retell AI" in footer
- [ ] "View Dashboard" button navigates to /dashboard
- [ ] Feature pills display (Multilingual, 24/7, etc.)
- [ ] Mobile responsive layout works

## 3. API Endpoints
- [ ] `GET /api/seats` returns JSON array of grades
- [ ] `POST /api/check-seats` with `{"grade": "LKG"}` returns availability
- [ ] `POST /api/check-seats` with `{"grade": "3"}` returns "full" status
- [ ] `GET /api/leads` returns lead array
- [ ] `GET /api/leads?status=new` filters correctly
- [ ] `POST /api/book-visit` creates lead and returns booking ID
- [ ] `POST /api/start-application` creates application record
- [ ] `POST /api/leads/[id]/follow-up` sends follow-up (if Resend configured)

## 4. Dashboard (/dashboard)
- [ ] Page loads without errors
- [ ] Retell phone number banner shows at top
- [ ] Stats cards display (Total Leads, Visits, Applications, Hot)
- [ ] Recent leads table populates
- [ ] Seat capacity progress bar works
- [ ] Critical grades badges appear
- [ ] Admissions funnel renders correctly

## 5. Leads (/leads)
- [ ] Lead table loads with sample data
- [ ] Tab filtering works (All, New, Interested, etc.)
- [ ] Column sorting works
- [ ] Lead detail sheet opens on "View" click
- [ ] Follow-up dialog opens on "Send" click
- [ ] Mobile card view works on small screens

## 6. Analytics (/analytics)
- [ ] Stacked bar chart renders
- [ ] Interest donut chart renders
- [ ] Seat occupancy chart renders
- [ ] Conversion insights display
- [ ] Period toggle (Daily/Weekly/Monthly) works

## 7. Follow-ups (/follow-ups)
- [ ] Stats cards display (Total Sent, Leads Contacted, Pending)
- [ ] Template cards display (5 templates)
- [ ] Recent follow-ups table shows history

## 8. Knowledge Base (/knowledge-base)
- [ ] All tabs render (Profile, Fees, Seats, Facilities, etc.)
- [ ] Seat availability fetches from API
- [ ] FAQ accordion opens/closes

## 9. Webhook Endpoint
- [ ] `POST /api/webhooks/retell` accepts valid payload
- [ ] Invalid signature returns 401
- [ ] `call_ended` event creates lead record
- [ ] `call_analyzed` event updates call data

## 10. Environment Variables
- [ ] `RETELL_API_KEY` is set in .env.local
- [ ] `RETELL_AGENT_ID` is set in .env.local
- [ ] `RETELL_PHONE_NUMBER_ID` is set in .env.local
- [ ] `RESEND_API_KEY` is set (optional)
- [ ] `.env.example` documents all variables

## 11. Code Quality
- [ ] `npm run lint` passes
- [ ] No `@elevenlabs` imports anywhere
- [ ] No browser microphone/WebRTC code
- [ ] All TypeScript types are correct
