# Dashboard Components

Design System cho Dashboard của GoodSeed App (Admin & User Dashboard)

## 📦 Components

### Base Components

#### DashboardButton
Button với nhiều variants theo GoodSeed design system.

```tsx
import { DashboardButton, DashboardIconButton } from './(components)'

<DashboardButton variant="primary">Save</DashboardButton>
<DashboardButton variant="secondary">View Details</DashboardButton>
<DashboardButton variant="outline">Cancel</DashboardButton>
<DashboardButton variant="danger">Delete</DashboardButton>

<DashboardIconButton 
  variant="primary" 
  icon={<Play />} 
  onClick={handleClick} 
/>
```

**Variants:**
- `primary` - Green button cho main actions
- `secondary` - Yellow button cho CTA
- `outline` - Outline button cho neutral actions
- `danger` - Red button cho destructive actions

---

#### DashboardBadge
Badge để hiển thị status.

```tsx
import { DashboardBadge } from './(components)'

<DashboardBadge variant="active">Active</DashboardBadge>
<DashboardBadge variant="inactive">Inactive</DashboardBadge>
<DashboardBadge variant="completed">Completed</DashboardBadge>
<DashboardBadge variant="failed">Failed</DashboardBadge>
```

**Variants:**
- `active` - Green outline
- `inactive` - Red outline
- `inProgress` - Yellow filled
- `completed` - Green filled
- `failed` - Red filled
- `warning` - Orange outline

---

#### DashboardCard
Card container với brutalist design.

```tsx
import { 
  DashboardCard, 
  DashboardCardHeader, 
  DashboardCardBody, 
  DashboardCardFooter 
} from './(components)'

<DashboardCard hover>
  <DashboardCardHeader>
    <h3>Card Title</h3>
    <DashboardBadge variant="active">Active</DashboardBadge>
  </DashboardCardHeader>
  
  <DashboardCardBody>
    <p>Card content goes here</p>
  </DashboardCardBody>
  
  <DashboardCardFooter>
    <DashboardButton variant="primary">Action</DashboardButton>
  </DashboardCardFooter>
</DashboardCard>
```

**Props:**
- `hover` - Add hover effect (shadow increase)

---

#### DashboardToggle
Toggle switch component.

```tsx
import { DashboardToggle } from './(components)'

<DashboardToggle
  label="Enable Feature"
  isActive={isEnabled}
  onChange={setIsEnabled}
/>
```

---

#### DashboardStatsCard
Card hiển thị metrics với trend.

```tsx
import { DashboardStatsCard } from './(components)'

<DashboardStatsCard
  label="Total Sellers"
  value={42}
  icon={<Users />}
  trend={{ value: "+5", isPositive: true }}
/>
```

---

#### DashboardProgressBar
Progress bar với variants.

```tsx
import { DashboardProgressBar } from './(components)'

<DashboardProgressBar
  label="Success Rate"
  percentage={85}
  variant="success"
/>
```

**Variants:**
- `success` - Green
- `warning` - Yellow
- `danger` - Red

---

#### DashboardAlert
Alert messages.

```tsx
import { DashboardAlert } from './(components)'

<DashboardAlert
  variant="critical"
  title="Error"
  message="Something went wrong"
/>
```

**Variants:**
- `critical` - Red background
- `warning` - Yellow background
- `success` - Green background
- `info` - Gray background

---

#### DashboardTable
Table component với styling.

```tsx
import {
  DashboardTable,
  DashboardTableHeader,
  DashboardTableBody,
  DashboardTableRow,
  DashboardTableCell,
} from './(components)'

<DashboardTable>
  <DashboardTableHeader>
    <DashboardTableRow>
      <DashboardTableCell isHeader>Name</DashboardTableCell>
      <DashboardTableCell isHeader>Status</DashboardTableCell>
    </DashboardTableRow>
  </DashboardTableHeader>
  <DashboardTableBody>
    <DashboardTableRow>
      <DashboardTableCell>Item 1</DashboardTableCell>
      <DashboardTableCell>Active</DashboardTableCell>
    </DashboardTableRow>
  </DashboardTableBody>
</DashboardTable>
```

---

### Layout Components

#### DashboardLayout
Main layout cho dashboard pages.

```tsx
import { DashboardLayout, DashboardSidebar, DashboardSidebarItem } from './(components)'

<DashboardLayout
  title="Admin Dashboard"
  subtitle="Manage your application"
  sidebar={
    <DashboardSidebar title="Menu">
      <DashboardSidebarItem 
        icon={<Home />}
        isActive={activeTab === 'home'}
        onClick={() => setActiveTab('home')}
      >
        Home
      </DashboardSidebarItem>
    </DashboardSidebar>
  }
>
  {/* Page content */}
</DashboardLayout>
```

---

### Feature Components

#### SellerCard
Card hiển thị thông tin seller.

```tsx
import { SellerCard } from './(components)'

<SellerCard
  seller={{
    id: 1,
    name: "Seller Name",
    url: "example.com",
    isActive: true,
    lastScraped: "2 hours ago",
    stats: {
      successRate: 95,
      productsScraped: 245,
      totalRuns: 42
    }
  }}
  onToggleActive={(id) => console.log('Toggle', id)}
  onManualScrape={(id) => console.log('Scrape', id)}
  showActions
/>
```

---

#### StatsOverview
Overview grid cho statistics.

```tsx
import { StatsOverview } from './(components)'

<StatsOverview
  stats={{
    totalSellers: 10,
    activeSellers: 8,
    totalProducts: 1500,
    successRate: 92,
    trends: {
      sellers: { value: "+2", isPositive: true },
      products: { value: "+150", isPositive: true }
    }
  }}
/>
```

---

## 🎨 Design Tokens

### Colors
```css
--bg-main: #FAF6E9;              /* Cream background */
--bg-section: #e1e4d1;           /* Light sage */
--text-primary: #3b4a3f;         /* Dark green */
--brand-primary: #27ae60;        /* Brand green */
--accent-cta: #ffe081;           /* CTA yellow */
--border-color: #3b4a3f;         /* Border */
--danger-color: #e74c3c;         /* Error red */
```

### Typography
- **Headers**: Archivo Black, uppercase, bold
- **Body**: Poppins, regular/medium/semibold

### Spacing
- Card padding: `24px` hoặc `32px`
- Border width: `3px` hoặc `6px`
- Shadow: `4px 4px 0` hoặc `8px 8px 0`

---

## 📝 Usage Guidelines

1. **Consistency**: Luôn sử dụng components từ design system thay vì tạo custom styles
2. **Variants**: Chọn variant phù hợp với context (primary cho main actions, danger cho destructive actions)
3. **Accessibility**: Đảm bảo labels đầy đủ cho form elements
4. **Responsive**: Components tự responsive, nhưng cần test trên mobile

---

## 🔧 Development

### Adding New Components

1. Tạo file trong `app/dashboard/(components)/`
2. Follow naming convention: `Dashboard[ComponentName].tsx`
3. Export từ `index.ts`
4. Document usage trong README này

### Design Principles

- **Bold & Brutalist**: Thick borders, hard shadows, no rounded corners
- **High Contrast**: Dark borders on light backgrounds
- **Playful**: Transform effects on hover
- **Functional**: Priority on usability over decoration
