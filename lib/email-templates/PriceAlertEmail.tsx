import { Button, Container, Head, Html, Section, Text, Link, Hr } from '@react-email/components';

interface PriceChange {
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string;
  productUrl: string;
  sellerName: string;
  sellerWebsite: string;
  affiliateTag?: string;
  variantPackSize: number;
  oldPrice: number;
  newPrice: number;
  priceChange: number;
  priceChangePercent: number;
  currency: string;
}

interface PriceAlertEmailProps {
  userName: string;
  priceChanges: PriceChange[];
  unsubscribeUrl: string;
}

export function PriceAlertEmail({ 
  userName, 
  priceChanges,
  unsubscribeUrl 
}: PriceAlertEmailProps) {
  // Group price changes by product
  const groupedByProduct = priceChanges.reduce((acc, change) => {
    const key = change.productId;
    if (!acc[key]) {
      acc[key] = {
        productName: change.productName,
        productSlug: change.productSlug,
        productImage: change.productImage,
        sellerName: change.sellerName,
        sellerWebsite: change.sellerWebsite,
        variants: []
      };
    }
    acc[key].variants.push(change);
    return acc;
  }, {} as Record<string, {
    productName: string;
    productSlug: string;
    productImage: string;
    sellerName: string;
    sellerWebsite: string;
    variants: PriceChange[];
  }>);

  const products = Object.values(groupedByProduct);
  const totalSavings = priceChanges.reduce((sum, change) => sum + Math.abs(change.priceChange), 0);

  return (
    <Html>
      <Head />
      <Section style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logo}>🌱 Goodseed</Text>
            <Text style={headerSubtitle}>Price Drop Alert</Text>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Text style={greeting}>
              Hi {userName}! 🎉
            </Text>
            
            <Text style={paragraph}>
              Great news! <strong style={{ color: '#27ae60' }}>{products.length} product{products.length > 1 ? 's' : ''}</strong> in your wishlist just dropped in price.
            </Text>

            {/* Summary Box */}
            <Section style={summaryBox}>
              <Text style={summaryTitle}>💰 Your Potential Savings</Text>
              <Text style={summaryAmount}>
                ${totalSavings.toFixed(2)} CAD
              </Text>
              <Text style={summarySubtext}>
                Across {priceChanges.length} price variant{priceChanges.length > 1 ? 's' : ''}
              </Text>
            </Section>

            {/* Price Changes List */}
            {products.map((product, idx) => (
              <Section key={idx} style={productCard}>
                <Text style={productName}>
                  🌿 {product.productName}
                </Text>
                <Text style={sellerInfo}>
                  Seller: <strong>{product.sellerName}</strong>
                </Text>

                {/* Variants */}
                {product.variants.map((variant, vIdx) => {
                  // Build affiliate URL
                  const affiliateUrl = variant.affiliateTag 
                    ? `${variant.productUrl}${variant.productUrl.includes('?') ? '&' : '?'}${variant.affiliateTag}`
                    : variant.productUrl;
                  
                  return (
                    <Section key={vIdx}>
                      <table style={variantTable}>
                        <tr>
                          <td style={variantCell}>
                            <Text style={variantPackSize}>
                              📦 {variant.variantPackSize} seeds
                            </Text>
                          </td>
                          <td style={variantCellRight}>
                            <Text style={oldPriceText}>
                              <span style={strikethrough}>${variant.oldPrice.toFixed(2)}</span>
                            </Text>
                            <Text style={newPriceText}>
                              ${variant.newPrice.toFixed(2)}
                            </Text>
                            <Text style={savingsTag}>
                              Save ${Math.abs(variant.priceChange).toFixed(2)} ({Math.abs(variant.priceChangePercent).toFixed(0)}% off)
                            </Text>
                          </td>
                        </tr>
                      </table>
                    </Section>
                  );
                })}

                {/* View Product Button - Link to vendor with affiliate */}
                <Section style={buttonContainer}>
                  {(() => {
                    const firstVariant = product.variants[0];
                    const affiliateUrl = firstVariant.affiliateTag 
                      ? `${firstVariant.productUrl}${firstVariant.productUrl.includes('?') ? '&' : '?'}${firstVariant.affiliateTag}`
                      : firstVariant.productUrl;
                    
                    return (
                      <Button
                        href={affiliateUrl}
                        style={button}
                      >
                        View on {product.sellerName}
                      </Button>
                    );
                  })()}
                </Section>
              </Section>
            ))}

            {/* Call to Action */}
            <Section style={ctaBox}>
              <Text style={ctaText}>
                ⚡ These prices won't last forever! Check your wishlist now to grab these deals.
              </Text>
              <Section style={buttonContainer}>
                <Button
                  href={`${process.env.NEXT_PUBLIC_APP_URL || 'https://www.goodseed.app'}/dashboard/user/favorites`}
                  style={primaryButton}
                >
                  🌟 View My Wishlist
                </Button>
              </Section>
            </Section>

            {/* Info Box */}
            <Section style={infoBox}>
              <Text style={infoText}>
                💡 <strong>Pro Tip:</strong> Prices can change quickly. We recommend adding products to your cart soon if you're interested.
              </Text>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              You're receiving this because you've enabled price alerts in your notification preferences.
            </Text>
            <Text style={footerText}>
              <Link href={unsubscribeUrl} style={footerLink}>
                Manage notification preferences
              </Link>
            </Text>
            <Hr style={divider} />
            <Text style={footerText}>
              © {new Date().getFullYear()} Goodseed. All rights reserved.
            </Text>
            <Text style={footerText}>
              Growing excellence, one seed at a time. 🌿
            </Text>
          </Section>
        </Container>
      </Section>
    </Html>
  );
}

// Styles matching goodseed brand
const main = {
  backgroundColor: '#FAF6E9',
  fontFamily: "'Poppins', 'Helvetica Neue', 'Segoe UI', Helvetica, sans-serif",
};

const container = {
  margin: '0 auto',
  padding: '20px 0',
  maxWidth: '600px',
  backgroundColor: '#e1e4d1'
};

const header = {
  padding: '32px 20px 24px',
  textAlign: 'center' as const,
  backgroundColor: '#ffffff',
  borderBottom: '3px solid #27ae60',
};

const logo = {
  fontSize: '36px',
  fontWeight: '900',
  color: '#3b4a3f',
  margin: '0',
  fontFamily: "'Archivo Black', sans-serif",
  letterSpacing: '-0.5px',
};

const headerSubtitle = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#27ae60',
  margin: '8px 0 0 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
};

const content = {
  padding: '40px 30px',
  backgroundColor: '#ffffff',
};

const greeting = {
  fontSize: '24px',
  fontWeight: '600',
  color: '#3b4a3f',
  margin: '0 0 16px 0',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#3b4a3f',
  margin: '16px 0',
};

const summaryBox = {
  backgroundColor: '#27ae60',
  border: '3px solid #3b4a3f',
  padding: '24px',
  margin: '24px 0',
  textAlign: 'center' as const,
};

const summaryTitle = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#ffffff',
  margin: '0 0 8px 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
};

const summaryAmount = {
  fontSize: '36px',
  fontWeight: '900',
  color: '#ffffff',
  margin: '8px 0',
  fontFamily: "'Archivo Black', sans-serif",
};

const summarySubtext = {
  fontSize: '13px',
  color: 'rgba(255, 255, 255, 0.9)',
  margin: '4px 0 0 0',
};

const productCard = {
  backgroundColor: '#FAF6E9',
  border: '2px solid #3b4a3f',
  padding: '20px',
  margin: '20px 0',
};

const productName = {
  fontSize: '18px',
  fontWeight: '700',
  color: '#3b4a3f',
  margin: '0 0 8px 0',
};

const sellerInfo = {
  fontSize: '14px',
  color: 'rgba(59, 74, 63, 0.7)',
  margin: '0 0 16px 0',
};

// Responsive table for variant rows
const variantTable = {
  width: '100%',
  borderTop: '1px solid rgba(59, 74, 63, 0.2)',
  padding: '12px 0',
};

const variantCell = {
  padding: '12px 0',
  verticalAlign: 'middle' as const,
  width: '40%',
};

const variantCellRight = {
  padding: '12px 0',
  verticalAlign: 'middle' as const,
  textAlign: 'right' as const,
  width: '60%',
};

const variantRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 0',
  borderTop: '1px solid rgba(59, 74, 63, 0.2)',
};

const variantLeft = {
  flex: '1',
};

const variantRight = {
  textAlign: 'right' as const,
};

const variantPackSize = {
  fontSize: '15px',
  fontWeight: '600',
  color: '#3b4a3f',
  margin: '0',
};

const oldPriceText = {
  fontSize: '14px',
  color: 'rgba(59, 74, 63, 0.6)',
  margin: '0 0 4px 0',
};

const strikethrough = {
  textDecoration: 'line-through',
};

const newPriceText = {
  fontSize: '20px',
  fontWeight: '700',
  color: '#27ae60',
  margin: '0 0 4px 0',
};

const savingsTag = {
  fontSize: '12px',
  fontWeight: '600',
  color: '#27ae60',
  backgroundColor: 'rgba(39, 174, 96, 0.15)',
  padding: '4px 8px',
  display: 'inline-block',
  margin: '0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '16px 0 0 0',
};

const button = {
  backgroundColor: '#ffffff',
  color: '#3b4a3f',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '10px 24px',
  border: '2px solid #3b4a3f',
  boxShadow: '2px 2px 0 #3b4a3f',
};

const ctaBox = {
  backgroundColor: '#e1e4d1',
  border: '3px solid #3b4a3f',
  padding: '24px',
  margin: '32px 0',
  textAlign: 'center' as const,
};

const ctaText = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#3b4a3f',
  margin: '0 0 20px 0',
};

const primaryButton = {
  backgroundColor: '#27ae60',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '700',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
  border: '2px solid #3b4a3f',
  boxShadow: '3px 3px 0 #3b4a3f',
};

const infoBox = {
  backgroundColor: '#FAF6E9',
  border: '2px solid #3b4a3f',
  padding: '16px',
  margin: '24px 0 0 0',
};

const infoText = {
  fontSize: '14px',
  lineHeight: '20px',
  color: '#3b4a3f',
  margin: '0',
};

const footer = {
  padding: '24px 20px',
  textAlign: 'center' as const,
  backgroundColor: '#e1e4d1',
  borderTop: '3px solid #3b4a3f',
};

const footerText = {
  fontSize: '13px',
  color: 'rgba(59, 74, 63, 0.6)',
  margin: '4px 0',
};

const footerLink = {
  color: '#27ae60',
  textDecoration: 'underline',
};

const divider = {
  borderColor: 'rgba(59, 74, 63, 0.3)',
  margin: '16px 0',
};

export default PriceAlertEmail;
