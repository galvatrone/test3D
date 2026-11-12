import { useState } from 'react'
import site from '../data/site.json'
import { LiquidGlass } from './LiquidGlass'

/** Demo form: nothing is sent anywhere. It says so after submit and offers the email instead. */
export function ContactForm() {
  const [sent, setSent] = useState(false)
  return (
    <LiquidGlass radius={28} className="contact-card">
      <form
        className="contact-form"
        onSubmit={(e) => {
          e.preventDefault()
          setSent(true)
        }}
      >
        <label>
          <span>Name</span>
          <input name="name" autoComplete="name" required />
        </label>
        <label>
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label className="full">
          <span>What are you building?</span>
          <textarea name="message" rows={4} required />
        </label>
        <div className="full form-foot">
          <button type="submit">Send message</button>
          <p role="status" className="form-status">
            {sent ? (
              <>
                Not sent: this form is a demo. Write to <a href={`mailto:${site.email}`}>{site.email}</a> instead.
              </>
            ) : (
              <>
                Or email <a href={`mailto:${site.email}`}>{site.email}</a>
              </>
            )}
          </p>
        </div>
      </form>
    </LiquidGlass>
  )
}
