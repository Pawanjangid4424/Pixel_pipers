# Pixel Pipers – Frontend

React + TypeScript website for Pixel Pipers, built with Vite, Tailwind CSS, Redux Toolkit and React Router.

## Run

```bash
npm install
npm run dev        # http://localhost:5174
npm run build      # production build in dist/
```

The backend must be running too (see `../Backend`).

## Settings (`.env`)

| Variable | Meaning |
|---|---|
| `VITE_SERVER_URL` | Flask backend URL, e.g. `http://localhost:5001` |
| `VITE_ML_TOKEN` | API token. It must equal `token` in `Backend/PIPE_model/credentials.json`. |

Restart `npm run dev` after editing `.env`.

## Folder guide

```
src/
├── main.tsx                 entry point (Redux + router + toast container)
├── App.tsx                  layout (header + page) and all routes
├── index.css                Tailwind imports
├── pages/
│   ├── Home.tsx             Demo + Footer
│   ├── Demo.tsx             upload image → send to backend → show result
│   ├── auth/Login.tsx, Register.tsx
│   ├── Payment.tsx, PaymentSuccess.tsx (Razorpay test)
│   └── NotFound.tsx         404
├── container/layout/        Header (responsive navbar) and Footer
├── components/
│   ├── buttons/             DemoBtn, CounterBtn
│   ├── card/ResultCard.tsx  result image + count
│   ├── form/                FormInput, FormButton
│   ├── nav/                 NavItem, NavButton (hamburger)
│   └── ui/                  Counter (threshold), ImageAnnotation, Loader, Toast
├── app/
│   ├── store.ts             Redux store
│   ├── hooks.ts             typed useAppDispatch / useAppSelector
│   ├── actions/             API calls (fileAction = pipe counting, authActions = login)
│   └── slices/              state for file result and auth
└── lib/
    ├── contents/            navbar links, register form fields
    ├── types/               TypeScript types
    └── validators/          form validation + showToast helper
```

## Responsive breakpoints (Tailwind)

| Prefix | Width | Used for |
|---|---|---|
| (none) | < 640px | phones: controls in a 2-column grid, hamburger menu |
| `sm:` | ≥ 640px | large phones / small tablets: controls in one row |
| `md:` | ≥ 768px | tablets: full navbar, cards at 3/4 width |
| `lg:` | ≥ 1024px | desktop: wider spacing, max card width |
