"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function SearchSection() {
  const [searchQuery, setSearchQuery] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  return (
    <section className="border-b-2 border-[#2d2d2d] bg-[#e8dfc8] py-8">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl">
          <div className="border-[3px] border-[#2d2d2d] bg-[#e8dfc8] p-2 flex gap-0">
            <div className="flex flex-1 bg-white">
              <Input
                type="text"
                placeholder="Search for seeds..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base px-4 bg-white"
              />
            </div>
            <Button className="bg-[#38a169] text-white hover:bg-[#2f9d5f] border-0 font-medium px-8">Search</Button>
            <Button
              onClick={() => setShowFilters(!showFilters)}
              className="bg-[#d4a11e] text-[#2d2d2d] hover:bg-[#c09219] border-0 font-medium px-8"
            >
              Filters
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
