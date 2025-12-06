"use client"

import { Bookmark, Heart } from "lucide-react"
import Image from "next/image"

interface ProductCardProps {
  badge: string
  badgeColor: "feminized" | "autoflower" | "regular"
  productName: string
  price: string
  company: string
  strain: string
  thc: string
  cbd: string
  imageUrl?: string
  productUrl: string
}

export function ProductCard({ badge, badgeColor, productName, price, company, strain, thc, cbd, imageUrl, productUrl }: ProductCardProps) {
  const badgeStyles = {
    feminized: "border-[#e91e63] text-[#e91e63]",
    autoflower: "border-[#38a169] text-[#38a169]",
    regular: "border-[#38a169] text-[#38a169]",
  }

  return (
    <div className="border-2 border-foreground bg-card">
      {/* Card Header with Badge and Icons */}
      <div className="relative border-b-2 border-foreground p-3 flex items-start justify-between">
        <span className={`text-xs font-semibold px-2 py-1 border ${badgeStyles[badgeColor]} uppercase`}>
          {badge}
        </span>
        <div className="flex gap-2">
          <button className="text-accent hover:opacity-80 transition-opacity">
            <Bookmark className="w-5 h-5 fill-current" />
          </button>
          <button className="text-primary hover:opacity-80 transition-opacity">
            <Heart className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Product Image */}
      <div className="relative h-48 bg-muted border-b-2 border-foreground">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={productName}
            fill
            className="object-contain p-4"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          />
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            No Image
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-bold text-lg text-foreground">{productName}</h3>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Starting At</p>
          <div className="flex items-end justify-between mt-1">
            <span className="text-2xl font-bold text-primary">{price}</span>
            <button
              onClick={() => window.open(productUrl, '_blank')}
              className="bg-accent text-accent-foreground px-4 py-2 text-sm font-semibold uppercase hover:opacity-90 transition-opacity"
            >
              View Packs
            </button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{company}</p>
        </div>

        {/* Strain Info */}
        <div className="flex gap-2 text-xs text-muted-foreground pt-2 border-t border-muted">
          <span>{strain}</span>
          <span>|</span>
          <span>{thc}</span>
          <span>|</span>
          <span>{cbd}</span>
        </div>
      </div>
    </div>
  )
}
