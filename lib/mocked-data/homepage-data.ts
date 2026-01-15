import { 
    faHeart, 
    faSearchDollar, 
    faShieldAlt
     
} from "@fortawesome/free-solid-svg-icons";

// Mocked data for herosection
const heroSectionData = {
    title: "Find the best cannabis seeds at the best price",
    description: "Search top seed banks, compare strains, and find the best prices."
}

const howItWorkSectionData = {
    title: "How It Works",
    description: "Getting the perfect seeds for your next grow has never been easier",
    steps: [
        {
            title: "Search",
            description: "Find the exact seeds you&apos;re looking for with our powerful search tools and filters."
        },
        {
            title: "Compare",
            description: "Compare prices from trusted vendors side by side to help you find the best deal."
        },
        {
            title: "Grow",
            description: "Purchase with confidence and start your perfect grow today."
        }
    ]
};

const featuresSectionData = {
    title: "Why Choose goodseed",
    description: "We make it easy to find and compare plant seeds from multiple trusted sources",
    features: [
        {
            icon: faSearchDollar,
            title: "Compare Prices",
            description: "See prices from sellers side by side to find the best deals on the seeds you want."
        },
        {
            icon: faShieldAlt,
            title: "Trusted Sources",
            description: "We link only to trusted seed banks, so you can shop with confidence."
        },
        {
            icon: faHeart,
            title: "Save Favorites",
            description: "Create an account to save your favorite seeds and get notified when prices drop."
        }
    ]
}

const ctaSectionData = {
    title: "Ready to Start Your next grow?",
    description: "Join thousands of happy growers who found their perfect seeds with goodseed",
    ctaLabel: "Browse Seeds Now",
    ctaHref: "/seeds"
}
