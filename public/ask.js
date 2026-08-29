(function () {
  const platform = window.FERTIGATION_PLATFORM

  function bindForm(form) {
    if (!form || form.getAttribute('data-ask-bound') === '1') return
    form.setAttribute('data-ask-bound', '1')
    const preset = form.getAttribute('data-reason') === 'house_quote' ? 'house_quote' : 'question'
    const status = form.querySelector('.ask-status')
    const button = form.querySelector('button[type="submit"]')

    function setStatus(text, ok) {
      if (!status) return
      status.hidden = false
      status.textContent = text
      status.className = ok ? 'ask-status ok-note' : 'ask-status error'
    }

    form.addEventListener('submit', async function (event) {
      event.preventDefault()
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
      if (button) button.disabled = true
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
        const reasonField = form.querySelector('[name="reason"]')
        if (reasonField) reasonField.value = preset
        setStatus('Received. The operator will see this on the queue.', true)
      } catch {
        setStatus('Could not send just now. Try again in a minute.', false)
      } finally {
        if (button) button.disabled = false
      }
    })
  }

  document.querySelectorAll('form.ask-form').forEach(bindForm)
})()
