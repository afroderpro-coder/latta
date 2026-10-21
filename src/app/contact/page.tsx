"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MessageCircle, CheckCircle2, Phone, Mail, Send } from "lucide-react";

const WHATSAPP_CONTACT_NUMBER = "919671016500";

export default function ContactPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [lastWhatsappUrl, setLastWhatsappUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

    const text =
      `💬 *NEW CONTACT INQUIRY - AFRODER*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 *Name:* ${fullName}\n` +
      `✉️ *Email:* ${email.trim()}\n` +
      (phone.trim() ? `📱 *Phone:* ${phone.trim()}\n` : "") +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `📝 *Message:*\n${message.trim()}\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `🌐 Sent from AFRODER Contact Us`;

    const whatsappUrl = `https://wa.me/${WHATSAPP_CONTACT_NUMBER}?text=${encodeURIComponent(text)}`;
    setLastWhatsappUrl(whatsappUrl);
    setSubmitted(true);

    // Automatically open WhatsApp in a new tab
    if (typeof window !== "undefined") {
      window.open(whatsappUrl, "_blank");
    }
  };

  const handleReset = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setMessage("");
    setSubmitted(false);
    setLastWhatsappUrl("");
  };

  return (
    <div className="container mx-auto px-4 py-16 md:py-24 max-w-2xl">
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tighter">Contact Us</h1>
          <p className="text-muted-foreground">
            Have a question, feedback, or need support? We&apos;d love to hear from you.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          {submitted ? (
            <div className="text-center space-y-6 py-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-semibold tracking-tight">
                  Opening WhatsApp...
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Your message has been formatted and forwarded to our official WhatsApp support desk (<span className="font-semibold text-foreground">+91 9671016500</span>).
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                {lastWhatsappUrl && (
                  <a
                    href={lastWhatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6 py-3 rounded-lg shadow-sm transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>Open WhatsApp Chat</span>
                  </a>
                )}
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="w-full sm:w-auto"
                >
                  Send Another Message
                </Button>
              </div>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">First Name *</label>
                  <Input
                    placeholder="Jane"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Last Name *</label>
                  <Input
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email *</label>
                  <Input
                    type="email"
                    placeholder="jane@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone / WhatsApp (Optional)</label>
                  <Input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Message *</label>
                <textarea
                  className="flex min-h-[140px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="How can we help you?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-lg transition-colors"
              >
                <MessageCircle className="w-5 h-5 mr-1" />
                <span>Send Message via WhatsApp</span>
                <Send className="w-4 h-4 ml-1 opacity-70" />
              </Button>
            </form>
          )}
        </div>

        <div className="text-center space-y-3 pt-6 text-sm text-muted-foreground border-t border-border/60">
          <div className="flex flex-wrap items-center justify-center gap-6">
            <span className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-primary" />
              <span>support@afroder.com</span>
            </span>
            <a
              href={`https://wa.me/${WHATSAPP_CONTACT_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 hover:text-emerald-600 transition-colors"
            >
              <Phone className="w-4 h-4 text-emerald-600" />
              <span>WhatsApp: +91 9671016500</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
