"use client"

import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function FilterSection() {
  const [type, setType] = useState("all")
  const [category, setCategory] = useState("all")
  const [sortBy, setSortBy] = useState("popularity")

  return (
    <section className="border-b-2 border-[#2d2d2d] bg-[#e8dfc8] py-6">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#2d2d2d]">Filter by Type:</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="bg-white border-2 border-[#2d2d2d] text-[#2d2d2d]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent className="border-2 border-[#2d2d2d]">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="vegetable">Vegetable</SelectItem>
                <SelectItem value="flower">Flower</SelectItem>
                <SelectItem value="herb">Herb</SelectItem>
                <SelectItem value="fruit">Fruit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#2d2d2d]">Filter by Category:</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-white border-2 border-[#2d2d2d] text-[#2d2d2d]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className="border-2 border-[#2d2d2d]">
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="organic">Organic</SelectItem>
                <SelectItem value="heirloom">Heirloom</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
                <SelectItem value="gmo-free">GMO-Free</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#2d2d2d]">Sort by:</label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="bg-white border-2 border-[#2d2d2d] text-[#2d2d2d]">
                <SelectValue placeholder="Popularity" />
              </SelectTrigger>
              <SelectContent className="border-2 border-[#2d2d2d]">
                <SelectItem value="popularity">Popularity</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="name">Name: A-Z</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </section>
  )
}
