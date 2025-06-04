# SEO-Friendly URLs with Slugs

## Overview

The Hafaloha Wholesale Fundraising system implements SEO-friendly URL slugs for fundraiser pages, enhancing user experience, shareability, and search engine optimization. This document outlines the implementation details, URL structures, and considerations for developers.

## URL Structure

### New URL Format

Fundraiser detail pages now use the format:
```
/wholesale/:slug
```

Items pages now use the format:
```
/wholesale/:slug/items
```

### Legacy URL Support (Backward Compatibility)

The system maintains support for previous URL formats:
```
/wholesale/fundraisers/:slug       -> Redirects to /wholesale/:slug
/wholesale/fundraisers/id/:id      -> Still supported for backward compatibility
/wholesale/fundraisers/:slug/items -> Redirects to /wholesale/:slug/items
```

## Implementation Details

### Routing Configuration

The routing is configured in `OnlineOrderingApp.tsx`:

```tsx
// New shorter fundraiser URL format
<Route path="wholesale/:slug" element={<FundraiserDetailPage />} />

// Support older URL formats for backwards compatibility
<Route path="wholesale/fundraisers/:slug" element={<RedirectToNewFundraiserUrl />} />
<Route path="wholesale/fundraisers/id/:id" element={<FundraiserDetailPage />} />
<Route path="wholesale/:slug/items" element={<FundraiserItemsPage />} />
<Route path="wholesale/fundraisers/:slug/items" element={<RedirectToItemsPage />} />
```

### Redirect Components

Dedicated redirect components handle legacy URL patterns:

```tsx
// Redirect component to handle moving from old fundraiser URLs to new format
const RedirectToNewFundraiserUrl = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (slug) {
      navigate(`/wholesale/${slug}`, { replace: true });
    }
  }, [slug, navigate]);
  
  return <div>Redirecting...</div>;
};

// Redirect component for items page URLs
const RedirectToItemsPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (slug) {
      navigate(`/wholesale/${slug}/items`, { replace: true });
    }
  }, [slug, navigate]);
  
  return <div>Redirecting...</div>;
};
```

### Components Updated

The following components have been updated to use the new URL pattern:

1. `FundraiserCard` - Updated link URLs
2. `FundraiserDetailPage` - Updated navigation to items page
3. `FundraiserItemsPage` - Updated "Back to Fundraiser" navigation
4. `WholesaleConfirmationPage` - Updated share links and navigation

## Best Practices

1. **Always use slug-based URLs**: When creating new links to fundraiser pages, always use the new format (`/wholesale/:slug`).
2. **Handle missing slugs**: Components should gracefully handle cases where a slug might be missing or invalid.
3. **SEO considerations**: The shorter, cleaner URLs improve shareability and SEO rankings.

## Testing

When testing the application, verify:
1. Navigation to fundraiser pages via the new URL format works correctly
2. Redirects from old URL formats function as expected
3. All internal links use the new URL format
4. Edge cases like invalid slugs are handled gracefully
