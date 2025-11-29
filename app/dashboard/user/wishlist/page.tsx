import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sprout } from "lucide-react"

export default function WishlistPage() {
    return (
        <>
            <main className="min-h-screen bg-[#e8dfc8]">
                <div className="container mx-auto px-4 py-12">
                    {/* Page Header */}
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold text-[#38a169] mb-2">MY FAVORITES</h1>
                        <p className="text-[#666666]">Manage your saved seeds and organize them into custom lists.</p>
                    </div>

                    {/* List Management Section */}
                    <div className="bg-white border-2 border-[#2d2d2d] p-6 mb-8">
                        <div className="flex items-end justify-between gap-4">
                            {/* Current List Selection */}
                            <div className="flex items-end gap-3">
                                <div>
                                    <label className="block text-sm text-[#2d2d2d] mb-2">Current List:</label>
                                    <Select defaultValue="default">
                                        <SelectTrigger className="w-[200px] border-2 border-[#2d2d2d] bg-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="default">Favorites (Default)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button
                                    variant="outline"
                                    className="border-2 border-[#2d2d2d] bg-white text-[#2d2d2d] hover:bg-[#f5f5f5]"
                                >
                                    Options
                                </Button>
                            </div>

                            {/* Create New List */}
                            <div className="flex items-end gap-3">
                                <div>
                                    <label className="block text-sm text-[#2d2d2d] mb-2">Create New List:</label>
                                    <Input placeholder="New list name" className="w-[250px] border-2 border-[#2d2d2d] bg-white" />
                                </div>
                                <Button className="bg-[#38a169] text-white hover:bg-[#2f8a59] border-2 border-[#2d2d2d]">Create</Button>
                            </div>
                        </div>
                    </div>

                    {/* Empty State */}
                    <div className="border-4 border-dashed border-[#2d2d2d] bg-[#d4c9b0] p-16 flex flex-col items-center justify-center text-center">
                        <Sprout className="h-16 w-16 text-[#666666] mb-6" />
                        <h2 className="text-2xl font-bold text-[#2d2d2d] mb-3">This List is Empty</h2>
                        <p className="text-[#666666] mb-6">Browse our collection to find your next favorite seed!</p>
                        <Button className="bg-[#d4a11e] text-[#2d2d2d] hover:bg-[#c09219] border-2 border-[#2d2d2d] font-medium px-6">
                            Browse Seed Collection
                        </Button>
                    </div>
                </div>
            </main>
        </>
    )
}
