"use client"

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Check local storage if already consented
    const consented = localStorage.getItem('cookie_consent')
    if (!consented) {
      setIsVisible(true)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'true')
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white/95 backdrop-blur-sm border-t border-emerald-100 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] animate-in slide-in-from-bottom duration-500">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1 text-center md:text-left">
          <p className="text-sm text-slate-600 leading-relaxed">
            <span className="font-bold text-emerald-800">🍪 Privasi Anda Penting.</span> 
            {' '}Aplikasi ini menggunakan cookie teknis untuk menyimpan sesi login Anda agar tetap aman dan nyaman. 
            Kami tidak menggunakan cookie pelacak iklan (tracker). 
            <button className="ml-1 text-emerald-600 hover:underline text-xs font-semibold">
              Pelajari Selengkapnya
            </button>
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto justify-center md:justify-end">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsVisible(false)}
            className="text-slate-500 hover:text-slate-700 hover:bg-slate-100"
          >
            Nanti Saja
          </Button>
          <Button 
            onClick={handleAccept}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200 px-6"
          >
            Saya Setuju
          </Button>
        </div>
      </div>
    </div>
  )
}
