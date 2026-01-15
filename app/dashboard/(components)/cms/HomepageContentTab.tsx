'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { HomepageContentSchema, type HomepageContentInput } from '@/schemas/content-page.schema';
import { useFetchHomepageContent, useUpdateHomepageContent } from '@/hooks/admin/content-management/homepage';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faSpinner, faRefresh } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'sonner';
import axios from 'axios';
import styles from '../dashboardAdmin.module.css';

export default function HomepageContentTab() {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<HomepageContentInput>({
    resolver: zodResolver(HomepageContentSchema),
    defaultValues: {
      hero: {
        title: 'Find the best cannabis seeds at the best price',
        description: 'Search top seed banks, compare strains, and find the best prices.',
      },
      howItWorks: {
        title: 'How It Works',
        description: 'Getting the perfect seeds for your next grow has never been easier',
        steps: [
          { title: 'Search', description: 'Find the exact seeds you\'re looking for with our powerful search tools and filters.' },
          { title: 'Compare', description: 'Compare prices from trusted vendors side by side to help you find the best deal.' },
          { title: 'Grow', description: 'Purchase with confidence and start your perfect grow today.' },
        ],
      },
      features: {
        title: 'Why Choose goodseed',
        description: 'We make it easy to find and compare plant seeds from multiple trusted sources',
        features: [
          { icon: 'faSearchDollar', title: 'Compare Prices', description: 'See prices from sellers side by side to find the best deals on the seeds you want.' },
          { icon: 'faShieldAlt', title: 'Trusted Sources', description: 'We link only to trusted seed banks, so you can shop with confidence.' },
          { icon: 'faHeart', title: 'Save Favorites', description: 'Create an account to save your favorite seeds and get notified when prices drop.' },
        ],
      },
      cta: {
        title: 'Ready to Start Your next grow?',
        description: 'Join thousands of happy growers who found their perfect seeds with goodseed',
        ctaLabel: 'Browse Seeds Now',
        ctaHref: '/seeds',
      },
    },
  });

  // Fetch homepage content automatically with Tanstack Query
  const { data: fetchedData, isFetching, refetch } = useFetchHomepageContent(true);

  // Update homepage content mutation
  const updateMutation = useUpdateHomepageContent();

  // Auto-populate form when data is fetched
  useEffect(() => {
    if (fetchedData) {
      reset(fetchedData);
    }
  }, [fetchedData, reset]);

  // Handle manual refetch
  const handleFetchContent = async () => {
    try {
      const result = await refetch();
      if (result.data) {
        reset(result.data);
        toast.success('Content reloaded successfully!');
      }
    } catch (error) {
      toast.error('Failed to reload content.');
    }
  };

  // Submit handler
  const onSubmit = async (data: HomepageContentInput) => {
    try {
      await updateMutation.mutateAsync(data);
      toast.success('Homepage updated successfully!');
      reset(data); // Reset form với data mới để clear isDirty state
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update homepage. Please try again.';
      toast.error(errorMessage);
    }
  };

  return (
    <div className={styles.cmsTabContainer}>
      <form onSubmit={handleSubmit(onSubmit)} className={styles.cmsForm}>
        {/* Hero Section */}
        <section className={styles.cmsSection}>
          <div className="flex justify-between items-center mb-6">
            <h3 className={styles.cmsSectionTitle}>Hero Section</h3>
            <button
              type="button"
              onClick={handleFetchContent}
              disabled={isFetching}
              className={styles.cmsSecondaryButton}
            >
              <FontAwesomeIcon icon={faRefresh} spin={isFetching} />
              {isFetching ? 'Loading...' : 'Load Current'}
            </button>
          </div>

          <div className={styles.cmsFormGroup}>
            <label htmlFor="hero.title" className={styles.cmsLabel}>
              Main Title
            </label>
            <input
              id="hero.title"
              {...register('hero.title')}
              className={styles.cmsInput}
              placeholder="Find Your Perfect Cannabis Seeds"
            />
            {errors.hero?.title && (
              <p className={styles.cmsError}>{errors.hero.title.message}</p>
            )}
          </div>

          <div className={styles.cmsFormGroup}>
            <label htmlFor="hero.description" className={styles.cmsLabel}>
              Description
            </label>
            <textarea
              id="hero.description"
              {...register('hero.description')}
              className={styles.cmsTextarea}
              rows={2}
              placeholder="Supporting text for the hero section"
            />
            {errors.hero?.description && (
              <p className={styles.cmsError}>{errors.hero.description.message}</p>
            )}
          </div>
        </section>

        {/* How It Works Section */}
        <section className={styles.cmsSection}>
          <h3 className={styles.cmsSectionTitle}>How It Works Section</h3>
          
          <div className={styles.cmsFormGroup}>
            <label htmlFor="howItWorks.title" className={styles.cmsLabel}>
              Section Title
            </label>
            <input
              id="howItWorks.title"
              {...register('howItWorks.title')}
              className={styles.cmsInput}
              placeholder="How It Works"
            />
            {errors.howItWorks?.title && (
              <p className={styles.cmsError}>{errors.howItWorks.title.message}</p>
            )}
          </div>

          <div className={styles.cmsFormGroup}>
            <label htmlFor="howItWorks.description" className={styles.cmsLabel}>
              Section Description
            </label>
            <textarea
              id="howItWorks.description"
              {...register('howItWorks.description')}
              className={styles.cmsTextarea}
              rows={2}
              placeholder="Getting the perfect seeds has never been easier"
            />
            {errors.howItWorks?.description && (
              <p className={styles.cmsError}>{errors.howItWorks.description.message}</p>
            )}
          </div>

          <div className={styles.cmsFeaturesGrid}>
            {[0, 1, 2].map((idx) => (
              <div key={idx} className={styles.cmsFeatureCard}>
                <div className={styles.cmsFeatureHeader}>
                  <span className={styles.cmsFeatureNumber}>Step {idx + 1}</span>
                </div>

                <div className={styles.cmsFormGroup}>
                  <label htmlFor={`howItWorks.steps.${idx}.title`} className={styles.cmsLabel}>
                    Title
                  </label>
                  <input
                    id={`howItWorks.steps.${idx}.title`}
                    {...register(`howItWorks.steps.${idx}.title` as const)}
                    className={styles.cmsInput}
                    placeholder="Step title"
                  />
                  {errors.howItWorks?.steps?.[idx]?.title && (
                    <p className={styles.cmsError}>{errors.howItWorks.steps[idx]?.title?.message}</p>
                  )}
                </div>

                <div className={styles.cmsFormGroup}>
                  <label htmlFor={`howItWorks.steps.${idx}.description`} className={styles.cmsLabel}>
                    Description
                  </label>
                  <textarea
                    id={`howItWorks.steps.${idx}.description`}
                    {...register(`howItWorks.steps.${idx}.description` as const)}
                    className={styles.cmsTextarea}
                    rows={3}
                    placeholder="Step description"
                  />
                  {errors.howItWorks?.steps?.[idx]?.description && (
                    <p className={styles.cmsError}>{errors.howItWorks.steps[idx]?.description?.message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section className={styles.cmsSection}>
          <h3 className={styles.cmsSectionTitle}>Features Section</h3>
          
          <div className={styles.cmsFormGroup}>
            <label htmlFor="features.title" className={styles.cmsLabel}>
              Section Title
            </label>
            <input
              id="features.title"
              {...register('features.title')}
              className={styles.cmsInput}
              placeholder="Why Choose goodseed"
            />
            {errors.features?.title && (
              <p className={styles.cmsError}>{errors.features.title.message}</p>
            )}
          </div>

          <div className={styles.cmsFormGroup}>
            <label htmlFor="features.description" className={styles.cmsLabel}>
              Section Description
            </label>
            <textarea
              id="features.description"
              {...register('features.description')}
              className={styles.cmsTextarea}
              rows={2}
              placeholder="We make it easy to find and compare plant seeds"
            />
            {errors.features?.description && (
              <p className={styles.cmsError}>{errors.features.description.message}</p>
            )}
          </div>

          <div className={styles.cmsFeaturesGrid}>
            {[0, 1, 2].map((idx) => (
              <div key={idx} className={styles.cmsFeatureCard}>
                <div className={styles.cmsFeatureHeader}>
                  <span className={styles.cmsFeatureNumber}>Feature {idx + 1}</span>
                </div>
                
                <div className={styles.cmsFormGroup}>
                  <label htmlFor={`features.features.${idx}.icon`} className={styles.cmsLabel}>
                    Icon (FontAwesome)
                  </label>
                  <input
                    id={`features.features.${idx}.icon`}
                    {...register(`features.features.${idx}.icon` as const)}
                    className={styles.cmsInput}
                    placeholder="faSearchDollar"
                  />
                  {errors.features?.features?.[idx]?.icon && (
                    <p className={styles.cmsError}>{errors.features.features[idx]?.icon?.message}</p>
                  )}
                </div>

                <div className={styles.cmsFormGroup}>
                  <label htmlFor={`features.features.${idx}.title`} className={styles.cmsLabel}>
                    Title
                  </label>
                  <input
                    id={`features.features.${idx}.title`}
                    {...register(`features.features.${idx}.title` as const)}
                    className={styles.cmsInput}
                    placeholder="Feature title"
                  />
                  {errors.features?.features?.[idx]?.title && (
                    <p className={styles.cmsError}>{errors.features.features[idx]?.title?.message}</p>
                  )}
                </div>

                <div className={styles.cmsFormGroup}>
                  <label htmlFor={`features.features.${idx}.description`} className={styles.cmsLabel}>
                    Description
                  </label>
                  <textarea
                    id={`features.features.${idx}.description`}
                    {...register(`features.features.${idx}.description` as const)}
                    className={styles.cmsTextarea}
                    rows={3}
                    placeholder="Feature description"
                  />
                  {errors.features?.features?.[idx]?.description && (
                    <p className={styles.cmsError}>{errors.features.features[idx]?.description?.message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className={styles.cmsSection}>
          <h3 className={styles.cmsSectionTitle}>Call to Action Section</h3>
          
          <div className={styles.cmsFormGroup}>
            <label htmlFor="cta.title" className={styles.cmsLabel}>
              CTA Title
            </label>
            <input
              id="cta.title"
              {...register('cta.title')}
              className={styles.cmsInput}
              placeholder="Ready to Start Your next grow?"
            />
            {errors.cta?.title && (
              <p className={styles.cmsError}>{errors.cta.title.message}</p>
            )}
          </div>

          <div className={styles.cmsFormGroup}>
            <label htmlFor="cta.description" className={styles.cmsLabel}>
              CTA Description
            </label>
            <textarea
              id="cta.description"
              {...register('cta.description')}
              className={styles.cmsTextarea}
              rows={2}
              placeholder="Join thousands of happy growers"
            />
            {errors.cta?.description && (
              <p className={styles.cmsError}>{errors.cta.description.message}</p>
            )}
          </div>

          <div className={styles.cmsFormRow}>
            <div className={styles.cmsFormGroup}>
              <label htmlFor="cta.ctaLabel" className={styles.cmsLabel}>
                Button Text
              </label>
              <input
                id="cta.ctaLabel"
                {...register('cta.ctaLabel')}
                className={styles.cmsInput}
                placeholder="Browse Seeds Now"
              />
              {errors.cta?.ctaLabel && (
                <p className={styles.cmsError}>{errors.cta.ctaLabel.message}</p>
              )}
            </div>

            <div className={styles.cmsFormGroup}>
              <label htmlFor="cta.ctaHref" className={styles.cmsLabel}>
                Button Link
              </label>
              <input
                id="cta.ctaHref"
                {...register('cta.ctaHref')}
                className={styles.cmsInput}
                placeholder="/seeds"
              />
              {errors.cta?.ctaHref && (
                <p className={styles.cmsError}>{errors.cta.ctaHref.message}</p>
              )}
            </div>
          </div>
        </section>

        {/* Submit Button */}
        <div className={styles.cmsFormFooter}>
          <button 
            type="submit" 
            disabled={updateMutation.isPending || !isDirty} 
            className={styles.cmsSubmitButton}
          >
            <FontAwesomeIcon icon={updateMutation.isPending ? faSpinner : faSave} spin={updateMutation.isPending} />
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
