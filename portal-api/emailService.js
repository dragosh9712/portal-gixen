const nodemailer = require('nodemailer')

function getTransport() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    tls:    { rejectUnauthorized: false },
  })
}

// Logo embedded ca base64 — funcționează și pe rețele interne (nu depinde de URL extern)
const LOGO_SRC = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGlkPSJMYXllcl8xIiBkYXRhLW5hbWU9IkxheWVyIDEiIHZpZXdCb3g9IjAgMCA4My41NiA0OS4yOCI+PGRlZnM+PHN0eWxlPiAgICAgIC5jbHMtMSB7ICAgICAgICBmaWxsOiB3aGl0ZTsgICAgICB9ICAgIDwvc3R5bGU+PC9kZWZzPjxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTU5Ljg5LDM0LjU5aC4wN2MuMjQtLjM0LjU0LS42OC45MS0xLjAxLjM3LS4zMy43OC0uNjIsMS4yNS0uODcuNDctLjI1Ljk5LS40NiwxLjU1LS42MS41Ny0uMTYsMS4xNy0uMjMsMS44LS4yM3MxLjE5LjA3LDEuNzYuMmMuNTYuMTQsMS4wOC4zNSwxLjU1LjY0LjQ3LjI5Ljg4LjY3LDEuMjQsMS4xMy4zNi40Ny42NCwxLjAyLjg1LDEuNjUuMTIuMzYuMTkuNzQuMjMsMS4xNi4wNC40MS4wNi45LjA2LDEuNDV2MTAuNzZoLTQuMDZ2LTEwLjE0YzAtLjQ0LS4wMi0uODItLjA1LTEuMTQtLjA0LS4zMi0uMDktLjYtLjE5LS44NC0uMi0uNTMtLjUxLS45LS45My0xLjEzLS40Mi0uMjMtLjkyLS4zNC0xLjUxLS4zNC0uNzksMC0xLjU0LjE5LTIuMjcuNTYtLjcyLjM3LTEuMzYuOTEtMS45MiwxLjYydjExLjQyaC00LjA2di0xNi41N2gzLjM2bC4zNywyLjNaTTQ4LjIxLDM1LjAyYy0uNTEsMC0uOTcuMDktMS4zNy4yOC0uNC4xOS0uNzQuNDQtMS4wMy43Ny0uMjkuMzMtLjUyLjcxLS42OSwxLjE0LS4xOC40My0uMjkuODktLjM0LDEuMzhoNi41MmMwLS40OS0uMDYtLjk1LS4yLTEuMzgtLjEzLS40My0uMzItLjgxLS41OC0xLjE0LS4yNi0uMzMtLjU4LS41OC0uOTYtLjc3LS4zOS0uMTktLjgzLS4yOC0xLjM0LS4yOFpNNDkuODQsNDYuMDJjLjc5LDAsMS42MS0uMDgsMi40Ni0uMjMuODYtLjE2LDEuNzItLjM5LDIuNi0uNjh2My4yMmMtLjUyLjIzLTEuMzMuNDQtMi40MS42NS0xLjA4LjItMi4yMS4zLTMuMzcuM3MtMi4yOS0uMTUtMy4zNS0uNDZjLTEuMDUtLjMtMS45Ny0uNzktMi43Ny0xLjQ2LS43OS0uNjctMS40MS0xLjU1LTEuODgtMi42Mi0uNDYtMS4wNy0uNy0yLjM3LS43LTMuOXMuMjItMi44Mi42NS0zLjk1Yy40My0xLjEzLDEuMDItMi4wNiwxLjc1LTIuOC43My0uNzQsMS41Ni0xLjMsMi41MS0xLjY3Ljk0LS4zNywxLjkyLS41NSwyLjkyLS41NXMyLjAyLjE2LDIuOTEuNDhjLjg4LjMyLDEuNjUuODIsMi4zLDEuNS42NS42OCwxLjE1LDEuNTYsMS41MSwyLjYzLjM2LDEuMDguNTQsMi4zNS41NCwzLjgyLS4wMS41Ny0uMDMsMS4wNS0uMDUsMS40NWgtMTAuODdjLjA2Ljc3LjIzLDEuNDIuNTEsMS45Ny4yOS41NC42NS45OSwxLjEyLDEuMzMuNDYuMzQsMSwuNTksMS42MS43NC42Mi4xNiwxLjI4LjIzLDIsLjIzWk0zMy40OSw0My4xbC00LjI4LDUuNzZoLTQuNjVsNi41NS04LjQ1LTYuMTUtOC4xMmg0Ljc3bDMuODcsNS40NywzLjk0LTUuNDdoNC43OWwtNi4zMyw4LjExLDYuNTEsOC40N2gtNC43NGwtNC4yNi01Ljc2Wk0yMS4wNywzMi4yOWg0LjA2djE2LjU3aC00LjA2di0xNi41N1pNNzIuMjgsNDUuMjNjLjItMy41NS4yMy02LjYyLjkyLTEwLjAzLDIuNjQtMTMuMSwxMC4zNS0xMy4wOSwxMC4zNi0yMi4zLDAtNy44MS03LjE4LTE0LjQ3LTE1LjYyLTEyLjU3LTMuOTkuOS02LjY0LDMuMjktOC4yOSw2LjA0LS44OSwxLjQ5LTEuNTgsMy40Mi0xLjczLDUuNDctLjEyLDEuNjguMiw0Ljk3LDEuMDMsNi4wNmwuODgtMS41LDEuOTUuNjktLjI0LDEuNDZjMCwuNy0uMDcuMTkuMTIuNDIuMzkuMzYuOTgtLjUyLDEuODQtLjcuMjIuNDguOSwxLjA5LDEuMTksMS41My0uMjguNzYtMS44OSwxLjY1LS41MiwxLjgyaDEuNHMuMzEsMi4wOS4zMSwyLjA5bC0xLjE1LjQ0Yy4xNC4xNy4wNC4wOC4yOC4yMiwyLjU1LDEuNDcsNi4xNSwxLjczLDguOTYuNzguNTgtLjIuNjEtLjYuOTItMS4xMSwxLjAzLTEuNywzLjQ1LTMuNzksNS4zLTQuNzctLjI2LjMxLS44Mi43Ny0xLjE0LDEuMDctNS42Niw1LjItNy4yMSwxMy40OS03LDIxLC4wMywxLjE4LjI3LDIuOS4yNCwzLjg5Wk02OS43OSw4LjIxYzMuMDMtLjc2LDUuNDYsMS40OCw1Ljk3LDMuODEuNjYsMi45OS0xLjQyLDUuNDgtMy44NSw1Ljk5LTQuNjEuOTYtNy43My00LjE3LTUuMTUtNy44MS43Mi0xLjAyLDEuNTktMS42MywzLjAyLTEuOTlaTTQ5LjE5LDI2LjU3aC40NGwuODQsMi4xMmguMDJsLjg2LTIuMTJoLjQ0bC0xLjY3LDQuMDJoLS40NGwuNTgtMS4zNy0xLjA2LTIuNjRaTTQ5LjA2LDI2LjkzaC0uMDNjLS4xLDAtLjIxLDAtLjMxLjAzLS4xLjAyLS4yLjA1LS4yOC4wOS0uMDkuMDQtLjE3LjA5LS4yNC4xNC0uMDcuMDYtLjEzLjEyLS4xOC4ydjEuODhoLS40NHYtMi43aC4zNGwuMDkuNDNoMGMuMDQtLjA3LjEtLjEzLjE2LS4xOS4wNi0uMDYuMTMtLjExLjIxLS4xNi4wOC0uMDUuMTctLjA4LjI2LS4xMS4xLS4wMy4xOS0uMDQuMy0uMDQuMDIsMCwuMDQsMCwuMDYsMCwuMDIsMCwuMDQsMCwuMDUsMHYuNDJaTTQ2Ljg5LDI3LjkyYzAsLjIxLS4wMy40MS0uMDkuNTgtLjA2LjE3LS4xNS4zMi0uMjYuNDUtLjExLjEyLS4yNS4yMi0uNC4yOS0uMTYuMDctLjMzLjEtLjUzLjFzLS4zOC0uMDMtLjU0LS4xYy0uMTYtLjA3LS4yOS0uMTYtLjQtLjI5LS4xMS0uMTItLjE5LS4yNy0uMjUtLjQ1LS4wNi0uMTctLjA5LS4zNy0uMDktLjU4cy4wMy0uNDEuMDktLjU4Yy4wNi0uMTcuMTUtLjMyLjI2LS40NS4xMS0uMTMuMjUtLjIyLjQtLjI5LjE2LS4wNy4zNC0uMS41My0uMXMuMzguMDMuNTQuMWMuMTYuMDcuMjkuMTYuNC4yOS4xMS4xMy4xOS4yNy4yNS40NS4wNi4xNy4wOS4zNy4wOS41OFpNNDYuNDMsMjcuOTJjMC0uMTctLjAyLS4zMi0uMDYtLjQ0LS4wNC0uMTMtLjEtLjI0LS4xNy0uMzMtLjA3LS4wOS0uMTYtLjE2LS4yNi0uMi0uMS0uMDUtLjIxLS4wNy0uMzMtLjA3cy0uMjMuMDItLjMzLjA3Yy0uMS4wNS0uMTkuMTEtLjI2LjItLjA3LjA5LS4xMy4yLS4xNy4zMy0uMDQuMTMtLjA2LjI4LS4wNi40NHMuMDIuMzEuMDYuNDRjLjA0LjEzLjEuMjQuMTcuMzMuMDcuMDkuMTYuMTYuMjYuMi4xLjA1LjIxLjA3LjMzLjA3cy4yMy0uMDIuMzMtLjA3Yy4xLS4wNS4xOS0uMTEuMjYtLjIuMDctLjA5LjEzLS4yLjE3LS4zMy4wNC0uMTMuMDYtLjI4LjA2LS40NFpNNDMuODksMjkuMjdzLS4xLjAzLS4xNy4wNGMtLjA4LjAxLS4xNy4wMi0uMjguMDItLjE0LDAtLjI2LS4wMi0uMzctLjA1LS4xLS4wMy0uMTktLjA5LS4yNi0uMTUtLjA3LS4wNy0uMTItLjE0LS4xNS0uMjQtLjAzLS4wOS0uMDUtLjItLjA1LS4zMXYtMS42NGgtLjUydi0uMzhoLjUydi0uNzRoLjQ0di43NGguODF2LjM4aC0uODF2MS41N2MwLC4wNiwwLC4xMi4wMy4xNy4wMi4wNS4wNS4xLjA5LjE0LjA0LjA0LjA5LjA3LjE1LjA5LjA2LjAyLjEzLjAzLjIyLjAzLjA2LDAsLjEyLDAsLjE5LS4wMS4wNiwwLC4xMy0uMDIuMTgtLjA0di4zN1pNNDEuMDYsMjYuNWMuMTMsMCwuMjYuMDEuMzcuMDQuMTIuMDMuMjIuMDcuMzEuMTF2LjM2Yy0uMTItLjA0LS4yMy0uMDgtLjMzLS4xLS4xLS4wMi0uMi0uMDMtLjMxLS4wMy0uMTEsMC0uMjIuMDItLjMzLjA1LS4xMS4wNC0uMi4xLS4yOS4xOC0uMDkuMDgtLjE1LjE5LS4yMS4zMy0uMDUuMTQtLjA4LjMtLjA4LjUsMCwuMTUuMDIuMjguMDYuNC4wNC4xMi4xLjIzLjE3LjMyLjA4LjA5LjE3LjE2LjI5LjIxLjEyLjA1LjI1LjA4LjQuMDguMTEsMCwuMjItLjAxLjMzLS4wMy4xMS0uMDIuMjItLjA2LjMzLS4xdi4zNnMtLjA3LjA0LS4xMy4wNmMtLjA1LjAyLS4xMS4wMy0uMTcuMDUtLjA2LjAxLS4xMy4wMy0uMi4wMy0uMDcsMC0uMTQuMDEtLjIxLjAxLS4xOCwwLS4zNS0uMDMtLjUyLS4wOC0uMTYtLjA1LS4zLS4xNC0uNDItLjI1LS4xMi0uMTEtLjIyLS4yNi0uMjktLjQzLS4wNy0uMTctLjEtLjM4LS4xLS42MiwwLS4xOC4wMi0uMzQuMDYtLjQ4LjA0LS4xNC4wOS0uMjcuMTUtLjM3LjA2LS4xMS4xNC0uMi4yMy0uMjguMDktLjA4LjE4LS4xNC4yOC0uMTkuMS0uMDUuMi0uMDguMy0uMS4xLS4wMi4yMS0uMDMuMy0uMDNaTTM4LjYyLDI4LjA4Yy0uMDgtLjAyLS4xOC0uMDQtLjI5LS4wNy0uMTEtLjAyLS4yMy0uMDMtLjM3LS4wMy0uMTksMC0uMzMuMDQtLjQ0LjEyLS4xMS4wOC0uMTYuMi0uMTYuMzcsMCwuMDguMDEuMTYuMDQuMjIuMDMuMDYuMDYuMTEuMTEuMTYuMDUuMDQuMS4wNy4xNi4wOS4wNi4wMi4xMy4wMy4yLjAzLjA5LDAsLjE4LS4wMS4yNi0uMDQuMDgtLjAzLjE1LS4wNi4yMi0uMS4wNi0uMDQuMTItLjA4LjE2LS4xMS4wNS0uMDQuMDgtLjA3LjEtLjA5di0uNTRaTTM4LjY0LDI4Ljk3aC0uMDFzLS4wOC4wOS0uMTQuMTRjLS4wNi4wNC0uMTIuMDgtLjE5LjEyLS4wNy4wNC0uMTUuMDYtLjI0LjA4LS4wOC4wMi0uMTguMDMtLjI3LjAzLS4xMywwLS4yNS0uMDItLjM2LS4wNi0uMTEtLjA0LS4yLS4xLS4yOC0uMTctLjA4LS4wNy0uMTQtLjE3LS4xOC0uMjctLjA0LS4xMS0uMDctLjIzLS4wNy0uMzdzLjAyLS4yNi4wNy0uMzZjLjA1LS4xMS4xMi0uMi4yLS4yNy4wOS0uMDcuMTktLjEzLjMxLS4xNy4xMi0uMDQuMjYtLjA2LjQxLS4wNi4xNCwwLC4yNy4wMS4zOS4wNC4xMi4wMi4yMy4wNS4zMi4wOWguMDF2LS4xOWMwLS4wNywwLS4xNC0uMDEtLjIsMC0uMDYtLjAzLS4xMS0uMDUtLjE1LS4wNS0uMDktLjEzLS4xNy0uMjQtLjIzLS4xMS0uMDYtLjI1LS4wOS0uNDQtLjA5LS4xNCwwLS4yNi4wMS0uMzguMDQtLjEyLjAzLS4yNC4wNi0uMzYuMXYtLjM3cy4xLS4wNC4xNi0uMDZjLjA2LS4wMi4xMy0uMDQuMi0uMDUuMDctLjAxLjE0LS4wMy4yMi0uMDMuMDgsMCwuMTUtLjAxLjIzLS4wMS4yNywwLC41LjA1LjY3LjE0LjE3LjEuMy4yMi4zOC4zOC4wMy4wNi4wNS4xMy4wNi4yLjAxLjA3LjAyLjE1LjAyLjI0djEuOGgtLjM3bC0uMDUtLjNaTTM2Ljc4LDI1LjVjLS4wNi0uMDEtLjEyLS4wMi0uMTktLjAzLS4wNywwLS4xMywwLS4xOCwwLS4xLDAtLjE5LjAxLS4yNi4wNC0uMDguMDItLjE0LjA2LS4yLjEyLS4wNS4wNS0uMDkuMTMtLjEyLjIxLS4wMy4wOS0uMDQuMTktLjA0LjMydi40MWguOHYuMzhoLS44djIuMzJoLS40NHYtMi4zMmgtLjQ3di0uMzhoLjQ3di0uNDFjMC0uMTkuMDMtLjM2LjA4LS40OS4wNS0uMTMuMTItLjI0LjIxLS4zMy4wOS0uMDkuMi0uMTUuMzItLjE5LjEyLS4wNC4yNS0uMDYuNC0uMDYuMDksMCwuMTcsMCwuMjUuMDEuMDgsMCwuMTMuMDIuMTcuMDN2LjM3Wk0zMy41OCwyNi45M2gtLjAzYy0uMSwwLS4yMSwwLS4zMS4wMy0uMS4wMi0uMTkuMDUtLjI4LjA5LS4wOS4wNC0uMTcuMDktLjI0LjE0LS4wNy4wNi0uMTMuMTItLjE4LjJ2MS44OGgtLjQ0di0yLjdoLjM0bC4wOS40M2gwYy4wNC0uMDcuMS0uMTMuMTYtLjE5LjA2LS4wNi4xMy0uMTEuMjEtLjE2LjA4LS4wNS4xNy0uMDguMjYtLjExLjA5LS4wMy4xOS0uMDQuMy0uMDQuMDIsMCwuMDQsMCwuMDYsMCwuMDIsMCwuMDQsMCwuMDUsMHYuNDJaTTMwLjQ4LDI4Ljk2Yy4xNSwwLC4yOC0uMDEuNC0uMDMuMTItLjAyLjI0LS4wNi4zNi0uMXYuMzZjLS4xLjA1LS4yMi4wOC0uMzYuMTEtLjE0LjAzLS4yOS4wNC0uNDYuMDQtLjE5LDAtLjM3LS4wMi0uNTQtLjA3LS4xNy0uMDUtLjMyLS4xMy0uNDQtLjI0LS4xMi0uMTEtLjIyLS4yNS0uMjktLjQzLS4wNy0uMTgtLjEtLjM5LS4xLS42NHMuMDMtLjQ2LjEtLjY0Yy4wNy0uMTguMTYtLjMzLjI3LS40NS4xMS0uMTIuMjQtLjIxLjM5LS4yNy4xNS0uMDYuMy0uMDkuNDYtLjA5LjE1LDAsLjI5LjAzLjQyLjA4LjEzLjA1LjI1LjEzLjM0LjI0LjEuMTEuMTcuMjUuMjMuNDIuMDUuMTcuMDguMzguMDguNjF2LjA2czAsLjA1LDAsLjExaC0xLjg3YzAsLjE3LjAzLjMyLjA4LjQ0LjA1LjEyLjEyLjIyLjIxLjI5LjA5LjA3LjIuMTMuMzIuMTYuMTIuMDMuMjUuMDUuMzkuMDVaTTMwLjI1LDI2Ljg4Yy0uMSwwLS4yLjAyLS4yOS4wNi0uMDkuMDQtLjE2LjA5LS4yMy4xNi0uMDYuMDctLjEyLjE1LS4xNi4yNC0uMDQuMDktLjA2LjE5LS4wNy4yOWgxLjM4YzAtLjExLS4wMS0uMjEtLjA0LS4zLS4wMy0uMDktLjA3LS4xNy0uMTItLjI0LS4wNS0uMDctLjEyLS4xMi0uMi0uMTYtLjA4LS4wNC0uMTctLjA2LS4yNy0uMDZaTTI4LjUsMjcuODljMCwuMTktLjAyLjM1LS4wNi41LS4wNC4xNC0uMDkuMjctLjE1LjM4LS4wNi4xMS0uMTMuMi0uMjEuMjctLjA4LjA3LS4xNy4xMy0uMjUuMTgtLjA5LjA0LS4xOC4wOC0uMjcuMS0uMDkuMDItLjE4LjAzLS4yNi4wMy0uMTcsMC0uMzEtLjAzLS40My0uMDgtLjEyLS4wNS0uMjMtLjEzLS4zMy0uMjRoMHYxLjU3aC0uNDN2LTQuMDJoLjMzbC4wOS4zMWgwcy4wNi0uMDcuMS0uMTFjLjA0LS4wNC4wOS0uMDcuMTYtLjExLjA3LS4wNC4xNC0uMDguMjQtLjExLjA5LS4wMy4xOS0uMDUuMy0uMDUuMTUsMCwuMy4wMy40NC4wOC4xNC4wNS4yNy4xMy4zNy4yNC4xMS4xMS4yLjI1LjI2LjQzLjA3LjE4LjEuMzkuMS42NFpNMjguMDQsMjcuOWMwLS4xNi0uMDItLjMtLjA1LS40Mi0uMDMtLjEyLS4wOC0uMjMtLjE1LS4zMi0uMDctLjA5LS4xNS0uMTYtLjI1LS4yLS4xLS4wNS0uMjEtLjA3LS4zNC0uMDctLjA5LDAtLjE3LjAxLS4yNS4wNC0uMDcuMDItLjE0LjA2LS4yLjA5LS4wNi4wNC0uMTEuMDgtLjE2LjEyLS4wNC4wNC0uMDguMDgtLjExLjEydjEuNDFjLjA5LjA5LjIuMTcuMzIuMjMuMTIuMDYuMjUuMDguMzguMDguMDgsMCwuMTctLjAyLjI3LS4wNS4wOS0uMDMuMTgtLjA5LjI2LS4xNy4wOC0uMDguMTQtLjE5LjItLjMzLjA1LS4xNC4wOC0uMzEuMDgtLjUzWk0yNC44MiwyOC4wOGMtLjA4LS4wMi0uMTgtLjA0LS4yOS0uMDctLjExLS4wMi0uMjMtLjAzLS4zNy0uMDMtLjE5LDAtLjMzLjA0LS40NC4xMi0uMTEuMDgtLjE2LjItLjE2LjM3LDAsLjA4LjAxLjE2LjA0LjIyLjAzLjA2LjA2LjExLjExLjE2LjA1LjA0LjEuMDcuMTYuMDkuMDYuMDIuMTMuMDMuMi4wMy4wOSwwLC4xOC0uMDEuMjYtLjA0LjA4LS4wMy4xNS0uMDYuMjItLjEuMDYtLjA0LjEyLS4wOC4xNi0uMTEuMDQtLjA0LjA4LS4wNy4xLS4wOXYtLjU0Wk0yNC44NSwyOC45N2gtLjAxcy0uMDguMDktLjE0LjE0Yy0uMDYuMDQtLjEyLjA4LS4xOS4xMi0uMDcuMDQtLjE1LjA2LS4yNC4wOC0uMDkuMDItLjE4LjAzLS4yNy4wMy0uMTMsMC0uMjUtLjAyLS4zNi0uMDYtLjExLS4wNC0uMi0uMS0uMjgtLjE3LS4wOC0uMDctLjE0LS4xNy0uMTgtLjI3LS4wNC0uMTEtLjA3LS4yMy0uMDctLjM3cy4wMi0uMjYuMDctLjM2Yy4wNS0uMTEuMTItLjIuMi0uMjcuMDktLjA3LjE5LS4xMy4zMS0uMTcuMTItLjA0LjI2LS4wNi40MS0uMDYuMTQsMCwuMjcuMDEuMzkuMDQuMTIuMDIuMjMuMDUuMzIuMDloLjAxdi0uMTljMC0uMDcsMC0uMTQtLjAxLS4yLDAtLjA2LS4wMy0uMTEtLjA1LS4xNS0uMDUtLjA5LS4xMy0uMTctLjI0LS4yMy0uMTEtLjA2LS4yNS0uMDktLjQ0LS4wOS0uMTQsMC0uMjYuMDEtLjM4LjA0LS4xMi4wMy0uMjQuMDYtLjM2LjF2LS4zN3MuMS0uMDQuMTYtLjA2Yy4wNi0uMDIuMTMtLjA0LjItLjA1LjA3LS4wMS4xNC0uMDMuMjItLjAzLjA4LDAsLjE1LS4wMS4yMy0uMDEuMjcsMCwuNS4wNS42Ny4xNC4xNy4xLjMuMjIuMzguMzguMDMuMDYuMDUuMTMuMDYuMi4wMS4wNy4wMi4xNS4wMi4yNHYxLjhoLS4zN2wtLjA1LS4zWk0yMi41NywyNy44OWMwLC4xOS0uMDIuMzUtLjA2LjUtLjA0LjE0LS4wOS4yNy0uMTUuMzgtLjA2LjExLS4xMy4yLS4yMS4yNy0uMDguMDctLjE3LjEzLS4yNS4xOC0uMDkuMDQtLjE4LjA4LS4yNy4xLS4wOS4wMi0uMTguMDMtLjI2LjAzLS4xNywwLS4zMS0uMDMtLjQzLS4wOC0uMTItLjA1LS4yMy0uMTMtLjMzLS4yNGgwdjEuNTdoLS40M3YtNC4wMmguMzNsLjA5LjMxaDBzLjA2LS4wNy4xLS4xMWMuMDQtLjA0LjA5LS4wNy4xNi0uMTEuMDctLjA0LjE0LS4wOC4yNC0uMTEuMDktLjAzLjE5LS4wNS4zLS4wNS4xNSwwLC4zLjAzLjQ0LjA4LjE0LjA1LjI3LjEzLjM3LjI0LjExLjExLjIuMjUuMjYuNDMuMDYuMTguMS4zOS4xLjY0Wk0yMi4xMSwyNy45YzAtLjE2LS4wMi0uMy0uMDUtLjQyLS4wMy0uMTItLjA4LS4yMy0uMTUtLjMyLS4wNy0uMDktLjE1LS4xNi0uMjUtLjItLjEtLjA1LS4yMS0uMDctLjM0LS4wNy0uMDksMC0uMTcuMDEtLjI1LjA0LS4wNy4wMi0uMTQuMDYtLjIuMDktLjA2LjA0LS4xMS4wOC0uMTYuMTItLjA0LjA0LS4wOC4wOC0uMTEuMTJ2MS40MWMuMDkuMDkuMi4xNy4zMi4yMy4xMi4wNi4yNS4wOC4zOC4wOC4wOCwwLC4xNy0uMDIuMjctLjA1LjA5LS4wMy4xOC0uMDkuMjYtLjE3LjA4LS4wOC4xNC0uMTkuMi0uMzMuMDUtLjE0LjA4LS4zMS4wOC0uNTNaTTU2LjMxLDE3LjA1bC4wMiwxLjczLS45Ny4zOWMtLjUyLS4yNi0uODItLjczLTEuMjgtMS4wMS0uNDEuMTUtLjY1LjQ3LS45NC42N2wuODUsMS41OC0uNjIuNzktMS43My0uMjRjLS4xNi40Mi0uMzIuNzItLjM2LDEuMjFsMS4zOS43My0uMDYsMS4xNmMtLjQ0LjA5LTEuMjkuMzUtMS41OS42MmwuMiwxLjExLDEuNjguMDIuNDYuOTljLS4zNy40OC0uNjcuNzktMS4wMywxLjI4bC42NC44OWMuNDktLjExLDEuMTItLjUsMS40OS0uOC4zNy4xNS42My4zNy45NS42NGwtLjI2LDEuNTljLjI3LjI2LjguMzksMS4xOS40NmwuNzctMS40NiwxLjA2LjA5Yy4zMS41LjM1LDEuMTQuNjgsMS41OGwxLjEzLS4xOHYtMS42NnMuOTgtLjQ4Ljk4LS40OGMuNTMuMzUuNzkuNywxLjI4LDEuMDIuMzctLjE0LjcyLS40Ni45Mi0uNzUtLjItLjQ2LS41NC0uOTYtLjc4LTEuMzhsLjU4LS45NCwxLjc2LjI4LjMzLTEuMTMtMS40My0uODRjMC0xLjguNDktLjk5LDEuNjQtMS43MmwtLjE2LTEuMTZjLTEuNzUsMC0xLjY1LjI5LTIuMTQtLjk2LjMyLS41My43Mi0uODgsMS4wNS0xLjM3LS4yMi0uMjYtLjUxLS41My0uNjgtLjg1LS42MS4xNS0uOTguNjUtMS42MS43N2wtLjgxLS41Ni4yNi0xLjY5LTEuMTItLjQyLS44NSwxLjQ3Yy0xLjk0LS4wNi0uODktLjU1LTEuNzMtMS42NmwtMS4xNy4xOVpNNTcuMTIsMTkuOTFjNS40My0xLjQ2LDcuNDUsNi43NCwyLjE0LDguMTQtNS4zNCwxLjQxLTcuNjgtNi42Ni0yLjE0LTguMTRaTTE1LjI0LDQwLjFoLTUuMTN2LTMuNWg5LjM0djExLjU1Yy0uMzQuMTMtLjc4LjI2LTEuMzEuNC0uNTMuMTMtMS4xMi4yNi0xLjc4LjM3LS42NS4xMS0xLjMzLjItMi4wMy4yNi0uNy4wNy0xLjM4LjExLTIuMDcuMTEtMi4wNiwwLTMuODUtLjI3LTUuMzgtLjgzLTEuNTQtLjU1LTIuODEtMS4zMy0zLjgzLTIuMzQtMS4wMi0xLTEuNzktMi4yLTIuMy0zLjU5LS41MS0xLjM5LS43Ni0yLjkyLS43Ni00LjYsMC0xLjE5LjEzLTIuMzIuNC0zLjQuMjctMS4wOC42Ny0yLjA4LDEuMTktMywuNTItLjkyLDEuMTYtMS43NSwxLjktMi40OS43NC0uNzQsMS41OS0xLjM4LDIuNTUtMS45Ljk1LS41MiwxLjk5LS45MiwzLjEzLTEuMiwxLjEzLS4yOCwyLjM1LS40MiwzLjY1LS40MiwxLjE1LDAsMi4yNS4wOCwzLjI5LjI1LDEuMDMuMTYsMS44OS4zNywyLjU1LjZ2My41M2MtLjg5LS4yNy0xLjc5LS40OC0yLjY5LS42Mi0uOTEtLjE1LTEuODItLjIyLTIuNzQtLjIyLTEuMjQsMC0yLjQxLjE5LTMuNDkuNTUtMS4wOS4zNy0yLjAyLjkyLTIuODEsMS42NS0uNzkuNzItMS40MiwxLjYyLTEuODcsMi42OC0uNDYsMS4wNi0uNjgsMi4yOS0uNjgsMy42OC4wMSwyLjcuNzIsNC43NCwyLjExLDYuMDksMS40LDEuMzUsMy4zOCwyLjAzLDUuOTUsMi4wMy40OCwwLC45OC0uMDIsMS40OC0uMDguNTEtLjA1Ljk2LS4xMiwxLjM1LS4ydi01LjM3WiI+PC9wYXRoPjwvc3ZnPg=='

function header() {
  return `
  <div style="background:#1a3a6b;padding:28px 32px;text-align:center;border-radius:8px 8px 0 0">
    <img src="${LOGO_SRC}" alt="Gixen" width="160" height="48" style="display:block;margin:0 auto;max-width:160px;border:0" />
    <div style="color:rgba(255,255,255,0.7);font-size:11px;margin-top:6px;letter-spacing:1px">PORTAL</div>
  </div>`
}

function wrap(title, body) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="100%" style="max-width:560px;border-radius:8px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
  <tr><td style="padding:0">${header()}</td></tr>
  <tr><td style="background:#fff;padding:32px">
    <h2 style="margin:0 0 16px;font-size:18px;color:#1a1a2e">${title}</h2>
    ${body}
  </td></tr>
  <tr><td style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb">
    <p style="margin:0;font-size:11px;color:#999">Gixen SRL · Portal B2B · <a href="https://gixen.ro" style="color:#1a6bbf;text-decoration:none">gixen.ro</a></p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`
}

async function send(to, subject, html) {
  const t = getTransport()
  if (!t) return
  await t.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, html })
}

// ── Exports ──────────────────────────────────────────────────────────────────

async function sendOnboardingPending(email, firmName) {
  const html = wrap('Cerere înregistrată', `
    <p style="color:#444;line-height:1.7">Bună ziua,</p>
    <p style="color:#444;line-height:1.7">Cererea de înregistrare pentru firma <strong>${firmName}</strong> a fost primită și este în curs de analiză.</p>
    <p style="color:#444;line-height:1.7">Veți fi notificat pe email imediat ce contul este aprobat.</p>
    <p style="color:#999;font-size:12px;margin-top:24px">Dacă nu ați inițiat această cerere, ignorați acest email.</p>`)
  await send(email, 'Cerere înregistrare Gixen Portal — în așteptare', html).catch(() => {})
}

async function sendOnboardingApproved(email, firmName) {
  const portalUrl = process.env.APP_URL || 'https://portal.gixen.ro'
  const html = wrap('Cont aprobat!', `
    <p style="color:#444;line-height:1.7">Bună ziua,</p>
    <p style="color:#444;line-height:1.7">Contul firmei <strong>${firmName}</strong> a fost aprobat. Vă puteți autentifica acum în portal.</p>
    <div style="text-align:center;margin:24px 0">
      <a href="${portalUrl}/login" style="display:inline-block;background:#1a6bbf;color:#fff;text-decoration:none;padding:12px 28px;border-radius:7px;font-weight:700;font-size:14px">Accesați portalul</a>
    </div>
    <p style="color:#999;font-size:12px">Dacă butonul nu funcționează: <a href="${portalUrl}/login" style="color:#1a6bbf">${portalUrl}/login</a></p>`)
  await send(email, 'Cont aprobat — Gixen Portal B2B', html).catch(() => {})
}

async function sendOnboardingRejected(email, firmName, reason) {
  const html = wrap('Cerere respinsă', `
    <p style="color:#444;line-height:1.7">Bună ziua,</p>
    <p style="color:#444;line-height:1.7">Ne pare rău că firma <strong>${firmName}</strong> nu îndeplinește criteriile necesare pentru activarea contului în portalul nostru B2B.</p>
    ${reason ? `<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:7px;padding:14px;margin:16px 0;color:#dc2626;font-size:13px"><strong>Motiv:</strong> ${reason}</div>` : ''}
    <p style="color:#444;line-height:1.7">Pentru mai multe informații, vă rugăm să contactați echipa noastră de vânzări.</p>`)
  await send(email, 'Cerere respinsă — Gixen Portal B2B', html).catch(() => {})
}

async function sendOrderPlaced(email, order) {
  const html = wrap(`Comandă confirmată — #${order.nr || order.id}`, `
    <p style="color:#444;line-height:1.7">Comanda dumneavoastră a fost plasată cu succes.</p>
    <table width="100%" style="border-collapse:collapse;margin:16px 0;font-size:13px">
      <tr style="background:#f8fafc"><td style="padding:8px 12px;font-weight:600;color:#555;width:40%">Număr comandă</td><td style="padding:8px 12px">#${order.nr || order.id}</td></tr>
      <tr><td style="padding:8px 12px;font-weight:600;color:#555">Total (cu TVA)</td><td style="padding:8px 12px;font-weight:700;color:#1a6bbf">${order.totalDisplay || ''}</td></tr>
      <tr style="background:#f8fafc"><td style="padding:8px 12px;font-weight:600;color:#555">Status</td><td style="padding:8px 12px"><span style="background:#dbeafe;color:#1e40af;padding:2px 10px;border-radius:20px;font-size:12px">În procesare</span></td></tr>
    </table>
    <p style="color:#444;line-height:1.7">Veți fi notificat când statusul comenzii se actualizează.</p>`)
  await send(email, `Comandă confirmată #${order.nr || order.id} — Gixen`, html).catch(() => {})
}

const ORDER_STATUS_LABELS = {
  plasata:         'Plasată',
  asteptare_plata: 'Așteptare plată',
  in_aprobare:     'În aprobare',
  aprobata:        'Aprobată',
  in_procesare:    'În procesare',
  aviz_generat:    'Aviz emis',
  in_livrare:      'În livrare',
  livrata:         'Livrată',
  anulata:         'Anulată',
  respinsa:        'Respinsă',
}
const ORDER_STATUS_COLORS = {
  plasata: '#6b7280', asteptare_plata: '#d97706', in_aprobare: '#ca8a04',
  aprobata: '#1e40af', in_procesare: '#1e40af', aviz_generat: '#1e40af',
  in_livrare: '#d97706', livrata: '#16a34a', anulata: '#dc2626', respinsa: '#dc2626',
}

async function sendOrderStatusChanged(email, order, newStatus) {
  const label = ORDER_STATUS_LABELS[newStatus] || newStatus
  const color = ORDER_STATUS_COLORS[newStatus] || '#555'
  const html = wrap(`Status comandă actualizat — #${order.nr || order.id}`, `
    <p style="color:#444;line-height:1.7">Statusul comenzii <strong>#${order.nr || order.id}</strong> a fost actualizat.</p>
    <div style="text-align:center;margin:20px 0;padding:16px;background:#f8fafc;border-radius:8px">
      <span style="font-size:18px;font-weight:700;color:${color}">${label}</span>
    </div>
    ${newStatus === 'anulata' ? '<p style="color:#dc2626;font-size:13px">Comanda a fost anulată. Contactați echipa noastră pentru detalii suplimentare.</p>' : ''}`)
  await send(email, `Status comandă #${order.nr || order.id}: ${label} — Gixen`, html).catch(() => {})
}

async function sendCreditLimitWarning(email, firmName, pct, available) {
  const html = wrap('Avertisment limită credit', `
    <p style="color:#444;line-height:1.7">Bună ziua,</p>
    <p style="color:#444;line-height:1.7">Limita de credit pentru firma <strong>${firmName}</strong> a atins <strong style="color:#d97706">${pct}%</strong> din limita alocată.</p>
    <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:7px;padding:14px;margin:16px 0;color:#92400e;font-size:13px">
      Credit disponibil rămas: <strong>${available}</strong>
    </div>
    <p style="color:#444;line-height:1.7">Vă rugăm să contactați managerul de cont pentru ajustarea limitei de credit.</p>`)
  await send(email, 'Avertisment limită credit — Gixen Portal', html).catch(() => {})
}

async function sendPasswordReset(email, resetLink) {
  const html = wrap('Resetare parolă', `
    <p style="color:#444;line-height:1.7">Ați solicitat resetarea parolei pentru contul Gixen Portal.</p>
    <p style="color:#444;line-height:1.7">Apăsați butonul de mai jos pentru a seta o parolă nouă. Link-ul este valabil <strong>2 ore</strong>.</p>
    <div style="text-align:center;margin:24px 0">
      <a href="${resetLink}" style="display:inline-block;background:#1a6bbf;color:#fff;text-decoration:none;padding:12px 28px;border-radius:7px;font-weight:700;font-size:14px">Resetează parola</a>
    </div>
    <p style="color:#999;font-size:12px">Dacă nu ați solicitat resetarea, ignorați acest email. Parola rămâne neschimbată.</p>
    <p style="color:#999;font-size:12px;word-break:break-all">Link: <a href="${resetLink}" style="color:#1a6bbf">${resetLink}</a></p>`)
  await send(email, 'Resetare parolă — Gixen Portal B2B', html).catch(() => {})
}

async function sendSurveyReminder(email, firmName) {
  const appUrl = process.env.APP_URL || ''
  const html = wrap('Completează profilul firmei tale', `
    <p style="color:#444;line-height:1.7">Bună ziua,</p>
    <p style="color:#444;line-height:1.7">Pentru a vă oferi cele mai potrivite produse și condiții comerciale, vă rugăm să completați scurtul chestionar de profil pentru firma <strong>${firmName}</strong>.</p>
    <p style="color:#444;line-height:1.7">Durează mai puțin de 2 minute și se face direct din portal, la prima logare.</p>
    ${appUrl ? `<div style="text-align:center;margin:24px 0">
      <a href="${appUrl}/dashboard" style="display:inline-block;background:#1a6bbf;color:#fff;text-decoration:none;padding:12px 28px;border-radius:7px;font-weight:700;font-size:14px">Completează acum</a>
    </div>` : ''}
    <p style="color:#999;font-size:12px">Vă mulțumim! Echipa Gixen.</p>`)
  await send(email, 'Reminder: completează profilul firmei — Gixen Portal', html)
}

async function sendOrderEdited(email, order, editedBy, reason) {
  const html = wrap(`Comandă modificată — #${order.nr || order.id}`, `
    <p style="color:#444;line-height:1.7">Comanda dumneavoastră <strong>#${order.nr || order.id}</strong> a fost modificată de echipa Gixen.</p>
    ${reason ? `<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:7px;padding:14px;margin:16px 0;color:#92400e;font-size:13px"><strong>Motiv modificare:</strong> ${reason}</div>` : ''}
    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:7px;padding:12px 14px;margin:12px 0;color:#075985;font-size:13px">
      Modificat de: <strong>${editedBy || 'administrator'}</strong>
    </div>
    <p style="color:#444;line-height:1.7">Dacă aveți întrebări despre modificările efectuate, vă rugăm să contactați echipa noastră de vânzări.</p>`)
  await send(email, `Comandă modificată #${order.nr || order.id} — Gixen`, html).catch(() => {})
}

async function sendLoginOtp(email, code) {
  const html = wrap('Cod de autentificare — Gixen Portal', `
    <p style="color:#444;line-height:1.7">Cineva (probabil dumneavoastră) încearcă să se autentifice în portalul Gixen.</p>
    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:24px;margin:20px 0;text-align:center">
      <div style="font-size:12px;color:#0369a1;font-weight:600;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px">Codul dumneavoastră de verificare</div>
      <div style="font-size:42px;font-weight:800;color:#0c4a6e;letter-spacing:12px;font-family:monospace">${code}</div>
      <div style="font-size:12px;color:#64748b;margin-top:8px">Valabil 10 minute</div>
    </div>
    <p style="color:#888;font-size:12px;line-height:1.6">Dacă nu ați solicitat acest cod, ignorați acest email — contul dumneavoastră este în siguranță.<br/>Nu partajați acest cod cu nimeni, inclusiv cu echipa Gixen.</p>`)
  await send(email, 'Cod de autentificare — Gixen Portal', html)
}

module.exports = {
  sendOnboardingPending,
  sendOnboardingApproved,
  sendOnboardingRejected,
  sendOrderPlaced,
  sendOrderStatusChanged,
  sendOrderEdited,
  sendCreditLimitWarning,
  sendPasswordReset,
  sendSurveyReminder,
  sendLoginOtp,
  ORDER_STATUS_LABELS,
}
