(function () {
  const mount = document.getElementById('ask-root')
  if (!mount) return

  const preset = mount.getAttribute('data-reason') === 'house_quote' ? 'house_quote' : 'question'
  const title = preset === 'house_quote' ? 'Request a House quote' : 'Ask a question'
  const submitLabel = preset === 'house_quote' ? 'Send House quote request' : 'Send question'

  mount.innerHTML =
    '<form class="ask-form" novalidate>' +
    '<p class="kicker">' +
    title +
    '</p>' +
    '<p class="quiet">No sign-in required. This lands on the operator queue.</p>' +
    '<label class="ask-field"><span>Name</span><input name="name" autocomplete="name" required /></label>' +
    '<label class="ask-field"><span>Facility</span><input name="facility" autocomplete="organization" /></label>' +
    '<label class="ask-field"><span>Email</span><input name="email" type="email" autocomplete="email" required /></label>' +
    '<label class="ask-field"><span>Reason</span><select name="reason">' +
    '<option value="question"' +
    (preset === 'question' ? ' selected' : '') +
    '>Ask a question</option>' +
    '<option value="house_quote"' +
    (preset === 'house_quote' ? ' selected' : '') +
    '>Request a House quote</option>' +
    '</select></label>' +
    '<label class="ask-field"><span>Message</span><textarea name="message" required></textarea></label>' +
    '<p class="ask-status quiet" hidden></p>' +
    '<button type="submit" class="cta">' +
    submitLabel +
    '</button>' +
    '</form>'

  const form = mount.querySelector('form')
  const status = mount.querySelector('.ask-status')
  const button = mount.querySelector('button[type="submit"]')

  function setStatus(text, ok) {
    status.hidden = false
    status.textContent = text
    status.className = ok ? 'ask-status ok-note' : 'ask-status error'
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault()
    const platform = window.FERTIGATION_PLATFORM
    if (!platform || !platform.url || !platform.anonKey) {
      setStatus('Could not send just now. Try again in a minute.', false)
      return
    }
    const data = new FormData(form)
    const name = String(data.get('name') || '').trim()
    const facility = String(data.get('facility') || '').trim()
    const email = String(data.get('email') || '').trim()
    const message = String(data.get('message') || '').trim()
    const reason = String(data.get('reason') || preset)
    if (!name || !email.includes('@') || !message) {
      setStatus('Name, email, and a message are required.', false)
      return
    }
    button.disabled = true
    setStatus('Sending…', true)
    try {
      const res = await fetch(platform.url.replace(/\/$/, '') + '/rest/v1/contact_requests', {
        method: 'POST',
        headers: {
          apikey: platform.anonKey,
          Authorization: 'Bearer ' + platform.anonKey,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          name: name.slice(0, 120),
          facility: facility.slice(0, 160),
          email: email.slice(0, 200),
          message: message.slice(0, 4000),
          reason: reason === 'house_quote' ? 'house_quote' : 'question',
        }),
      })
      if (!res.ok) throw new Error('send failed')
      form.reset()
      form.reason.value = preset
      setStatus('Received. The operator will see this on the queue.', true)
    } catch {
      setStatus('Could not send just now. Try again in a minute.', false)
    } finally {
      button.disabled = false
    }
  })
})()
