import { Button, Container, Head, Html, Img, Link, Section, Text } from '@react-email/components';

export function MagicLinkEmail({ url, email }: { url: string, email: string }) {
  return (
    <Html>
      <Head />
      <Section style={main}>
        <Container style={container}>
          {/* Header với logo */}
          <Section style={header}>
            <Text style={logo}>🌱 Goodseed</Text>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Text style={greeting}>
              Hi there! 👋
            </Text>
            
            <Text style={paragraph}>
              Welcome to <strong style={{ color: '#27ae60' }}>goodseed</strong> - your trusted source for premium cannabis seeds.
            </Text>
            
            <Text style={paragraph}>
              Click the button below to sign in to your account:
            </Text>

            {/* CTA Button */}
            <Section style={buttonContainer}>
              <Button
                href={url}
                style={button}
              >
                🔓 Sign In to goodseed
              </Button>
            </Section>

            <Text style={linkText}>
              Or copy and paste this link into your browser:
            </Text>
            <Link href={url} style={link}>
              {url}
            </Link>

            {/* Security notice */}
            <Section style={securityBox}>
              <Text style={securityText}>
                🔒 <strong>Security Notice:</strong> This magic link expires in 24 hours and can only be used once.
              </Text>
              <Text style={securityText}>
                If you didn't request this email, please ignore it. Your account remains secure.
              </Text>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              © {new Date().getFullYear()} goodseed. All rights reserved.
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
  padding: '32px 20px',
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

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#27ae60',
  // borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '700',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
  border: '2px solid #3b4a3f',
  boxShadow: '3px 3px 0 #3b4a3f',
  transition: 'all 0.2s ease',
};

const linkText = {
  fontSize: '13px',
  color: 'rgba(59, 74, 63, 0.6)',
  margin: '24px 0 8px 0',
};

const link = {
  fontSize: '13px',
  color: '#27ae60',
  textDecoration: 'underline',
  wordBreak: 'break-all' as const,
};

const securityBox = {
  backgroundColor: '#e1e4d1',
  border: '3px solid #3b4a3f',
  // borderRadius: '8px',
  padding: '20px',
  margin: '32px 0 0 0',
};

const securityText = {
  fontSize: '14px',
  lineHeight: '20px',
  color: '#3b4a3f',
  margin: '8px 0',
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
