'use client';

import { useFetchFaqContent, useUpdateFaqContent } from '@/hooks/admin/content-management/faq';
import { FaqContentInput, FaqContentSchema } from '@/schemas/faq.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faTrash,
  faSave,
  faEye,
  faEyeSlash,
  faGripVertical,
  faExpand,
  faCompress,
} from '@fortawesome/free-solid-svg-icons';
import styles from '../dashboardAdmin.module.css';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import CategoryModal from '@/components/custom/CategoryModal';
import FaqItemModal from '@/components/custom/FaqItemModal';

export default function FaqContentTab() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch FAQ content automatically with Tanstack Query
  const { data: fetchedData, refetch, isFetching } = useFetchFaqContent(true);
  const updateMutation = useUpdateFaqContent();

  // React Hook Form with nested structure
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<FaqContentInput>({
    resolver: zodResolver(FaqContentSchema),
    defaultValues: {
      settings: {
        title: 'Frequently Asked Questions',
        description: 'Find answers to the most common questions about our services.',
        noAnswerMessage: "Can't find the answer you're looking for?",
        contactLabel: 'Contact Us',
        contactHref: '/contact',
        isPublished: true,
      },
      categories: [],
    },
  });

  // Field arrays for categories
  const {
    fields: categoryFields,
    append: appendCategory,
    remove: removeCategory,
  } = useFieldArray({
    control,
    name: 'categories',
  });

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
        toast.success('FAQ content reloaded successfully!');
      }
    } catch (error) {
      toast.error('Failed to reload FAQ content');
    }
  };

  // Submit form
  const onSubmit = async (formData: FaqContentInput) => {
    try {
      await updateMutation.mutateAsync(formData);
      toast.success('FAQ content updated successfully!');
      reset(formData); // Reset form with submitted data to clear dirty state
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update FAQ content';
      toast.error(errorMessage);
    }
  };

  // Add new category
  const handleAddCategory = (categoryData: { name: string; icon: string }) => {
    appendCategory({
      name: categoryData.name,
      icon: categoryData.icon,
      order: categoryFields.length,
      isVisible: true,
      items: [],
    });
    toast.success('Category added! Remember to save changes.');
  };

  return (
    <div className={styles.cmsTabContainer}>
      {/* Category Modal */}
      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleAddCategory}
        title="Add New FAQ Category"
      />

      <form onSubmit={handleSubmit(onSubmit)} className={styles.faqContainer}>
        {/* Header Actions */}
        <div className={styles.cmsHeader}>
          <button
            type="button"
            onClick={handleFetchContent}
            disabled={isFetching}
            className={styles.cmsSecondaryButton}
          >
            {isFetching ? 'Loading...' : 'Load From Database'}
          </button>
          <button
            type="submit"
            disabled={!isDirty || updateMutation.isPending}
            className={styles.cmsSubmitButton}
          >
            <FontAwesomeIcon icon={faSave} />
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Page Settings Section */}
        <section className={styles.cmsSection}>
          <h3 className={styles.cmsSectionTitle}>Page Settings</h3>

          <div className={styles.cmsFormGroup}>
            <label className={styles.cmsLabel}>Page Title</label>
            <input
              {...register('settings.title')}
              className={styles.cmsInput}
              placeholder="Frequently Asked Questions"
            />
            {errors.settings?.title && (
              <span className={styles.cmsError}>{errors.settings.title.message}</span>
            )}
          </div>

          <div className={styles.cmsFormGroup}>
            <label className={styles.cmsLabel}>Page Description</label>
            <textarea
              {...register('settings.description')}
              className={styles.cmsTextarea}
              rows={2}
              placeholder="Find answers to the most common questions..."
            />
            {errors.settings?.description && (
              <span className={styles.cmsError}>{errors.settings.description.message}</span>
            )}
          </div>

          <div className={styles.cmsFormGroup}>
            <label className={styles.cmsLabel}>No Answer Message</label>
            <input
              {...register('settings.noAnswerMessage')}
              className={styles.cmsInput}
              placeholder="Can't find the answer you're looking for?"
            />
            {errors.settings?.noAnswerMessage && (
              <span className={styles.cmsError}>{errors.settings.noAnswerMessage.message}</span>
            )}
          </div>

          <div className={styles.cmsFormRow}>
            <div className={styles.cmsFormGroup}>
              <label className={styles.cmsLabel}>Contact Button Label</label>
              <input
                {...register('settings.contactLabel')}
                className={styles.cmsInput}
                placeholder="Contact Us"
              />
              {errors.settings?.contactLabel && (
                <span className={styles.cmsError}>{errors.settings.contactLabel.message}</span>
              )}
            </div>

            <div className={styles.cmsFormGroup}>
              <label className={styles.cmsLabel}>Contact Button Link</label>
              <input
                {...register('settings.contactHref')}
                className={styles.cmsInput}
                placeholder="/contact"
              />
              {errors.settings?.contactHref && (
                <span className={styles.cmsError}>{errors.settings.contactHref.message}</span>
              )}
            </div>
          </div>

          <div className={styles.cmsFormGroup}>
            <label className={styles.cmsCheckboxLabel}>
              <input type="checkbox" {...register('settings.isPublished')} />
              <span>Published (visible on website)</span>
            </label>
          </div>
        </section>

        {/* Categories Section */}
        <section className={styles.cmsSection}>
          <div className={styles.cmsSectionHeader}>
            <h3 className={styles.cmsSectionTitle}>FAQ Categories</h3>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className={styles.cmsIconButton}
              title="Add Category"
            >
              <FontAwesomeIcon icon={faPlus} /> Add Category
            </button>
          </div>

          {categoryFields.length === 0 ? (
            <div className={styles.faqEmptyState}>
              <p>No categories yet. Click &quot;Add Category&quot; to create one.</p>
            </div>
          ) : (
            categoryFields.map((categoryField, categoryIndex) => (
              <CategorySection
                key={categoryField.id}
                categoryIndex={categoryIndex}
                categoryField={categoryField}
                register={register}
                control={control}
                errors={errors}
                removeCategory={removeCategory}
                watch={watch}
              />
            ))
          )}
        </section>

        {errors.categories && (
          <div className={styles.cmsError}>{errors.categories.message}</div>
        )}
      </form>
    </div>
  );
}

// Category Section Component
function CategorySection({
  categoryIndex,
  categoryField,
  register,
  control,
  errors,
  removeCategory,
  watch,
}: {
  categoryIndex: number;
  categoryField: any;
  register: any;
  control: any;
  errors: any;
  removeCategory: any;
  watch: any;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});

  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
  } = useFieldArray({
    control,
    name: `categories.${categoryIndex}.items`,
  });

  const categoryError = errors.categories?.[categoryIndex];
  const isVisible = watch(`categories.${categoryIndex}.isVisible`);
  const categoryName = watch(`categories.${categoryIndex}.name`) || 'Unnamed Category';

  // Handle add item from modal
  const handleAddItem = (itemData: { question: string; answer: string }) => {
    appendItem({
      question: itemData.question,
      answer: itemData.answer,
      order: itemFields.length,
      isVisible: true,
    });
    toast.success('FAQ item added! Remember to save changes.');
  };

  // Toggle all items
  const handleExpandAll = () => {
    const newState: Record<number, boolean> = {};
    itemFields.forEach((_, index) => {
      newState[index] = true;
    });
    setExpandedItems(newState);
  };

  const handleCollapseAll = () => {
    setExpandedItems({});
  };

  const toggleItem = (itemIndex: number) => {
    setExpandedItems((prev) => ({
      ...prev,
      [itemIndex]: !prev[itemIndex],
    }));
  };

  return (
    <div className={styles.faqCategoryCard}>
      {/* FAQ Item Modal */}
      <FaqItemModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        onSave={handleAddItem}
        title="Add New FAQ Item"
        categoryName={categoryName}
      />
      {/* Category Header */}
      <div className={styles.faqCategoryHeader}>
        <FontAwesomeIcon icon={faGripVertical} className={styles.dragHandle} />
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className={styles.expandButton}
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          <span className={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
        </button>
        <input
          {...register(`categories.${categoryIndex}.name`)}
          className={styles.faqCategoryInput}
          placeholder="Category Name"
        />
        <span className={styles.itemCount}>
          ({itemFields.length} {itemFields.length === 1 ? 'item' : 'items'})
        </span>
        <div className={styles.faqCategoryActions}>
          <button
            type="button"
            onClick={() =>
              register(`categories.${categoryIndex}.isVisible`).onChange({
                target: { value: !isVisible },
              })
            }
            className={styles.cmsIconButton}
            title={isVisible ? 'Hide Category' : 'Show Category'}
          >
            <FontAwesomeIcon icon={isVisible ? faEye : faEyeSlash} />
          </button>
          <button
            type="button"
            onClick={() => removeCategory(categoryIndex)}
            className={styles.cmsIconButton}
            title="Delete Category"
          >
            <FontAwesomeIcon icon={faTrash} />
          </button>
        </div>
      </div>

      {categoryError?.name && (
        <span className={styles.cmsError}>{categoryError.name.message}</span>
      )}

      {/* Expandable Content */}
      {isExpanded && (
        <div className={styles.categoryExpandedContent}>
          {/* Category Icon */}
          <div className={styles.cmsFormGroup}>
            <label className={styles.cmsLabel}>Icon Name (FontAwesome)</label>
            <input
              {...register(`categories.${categoryIndex}.icon`)}
              className={styles.cmsInput}
              placeholder="faLeaf"
            />
            {categoryError?.icon && (
              <span className={styles.cmsError}>{categoryError.icon.message}</span>
            )}
          </div>

          {/* FAQ Items */}
          <div className={styles.faqItemsSection}>
            <div className={styles.faqItemsHeader}>
              <h4>FAQ Items</h4>
              <div className={styles.faqItemsHeaderActions}>
                {itemFields.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={handleExpandAll}
                      className={styles.cmsSmallButton}
                      title="Expand All Items"
                    >
                      <FontAwesomeIcon icon={faExpand} /> Expand All
                    </button>
                    <button
                      type="button"
                      onClick={handleCollapseAll}
                      className={styles.cmsSmallButton}
                      title="Collapse All Items"
                    >
                      <FontAwesomeIcon icon={faCompress} /> Collapse All
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(true)}
                  className={styles.cmsIconButton}
                  title="Add FAQ Item"
                >
                  <FontAwesomeIcon icon={faPlus} /> Add Item
                </button>
              </div>
            </div>

            {itemFields.length === 0 ? (
              <p className={styles.faqEmptyCategory}>
                No FAQ items yet. Click &quot;Add Item&quot; to create one.
              </p>
            ) : (
              itemFields.map((itemField, itemIndex) => (
                <FaqItemCard
                  key={itemField.id}
                  categoryIndex={categoryIndex}
                  itemIndex={itemIndex}
                  register={register}
                  watch={watch}
                  removeItem={removeItem}
                  itemError={categoryError?.items?.[itemIndex]}
                  isExpanded={expandedItems[itemIndex] || false}
                  toggleExpanded={() => toggleItem(itemIndex)}
                />
              ))
            )}
          </div>

          {categoryError?.items && typeof categoryError.items.message === 'string' && (
            <span className={styles.cmsError}>{categoryError.items.message}</span>
          )}
        </div>
      )}
    </div>
  );
}

// FAQ Item Card Component (with collapse/expand)
function FaqItemCard({
  categoryIndex,
  itemIndex,
  register,
  watch,
  removeItem,
  itemError,
  isExpanded,
  toggleExpanded,
}: {
  categoryIndex: number;
  itemIndex: number;
  register: any;
  watch: any;
  removeItem: any;
  itemError: any;
  isExpanded: boolean;
  toggleExpanded: () => void;
}) {

  const itemVisible = watch(`categories.${categoryIndex}.items.${itemIndex}.isVisible`);
  const question = watch(`categories.${categoryIndex}.items.${itemIndex}.question`) || 'Untitled Question';

  return (
    <div className={styles.faqItemCard}>
      <div className={styles.faqItemHeader}>
        <FontAwesomeIcon icon={faGripVertical} className={styles.dragHandle} />
        <button
          type="button"
          onClick={toggleExpanded}
          className={styles.expandButton}
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          <span className={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
        </button>
        <span className={styles.faqItemNumber}>#{itemIndex + 1}</span>
        <span className={styles.faqQuestionPreview}>{question}</span>
        <div className={styles.faqItemActions}>
          <button
            type="button"
            onClick={() =>
              register(`categories.${categoryIndex}.items.${itemIndex}.isVisible`).onChange({
                target: { value: !itemVisible },
              })
            }
            className={styles.cmsIconButton}
            title={itemVisible ? 'Hide Item' : 'Show Item'}
          >
            <FontAwesomeIcon icon={itemVisible ? faEye : faEyeSlash} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm('Are you sure you want to delete this FAQ item?')) {
                removeItem(itemIndex);
                toast.success('FAQ item removed! Remember to save changes.');
              }
            }}
            className={styles.cmsIconButton}
            title="Delete Item"
          >
            <FontAwesomeIcon icon={faTrash} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className={styles.faqItemContent}>
          <div className={styles.cmsFormGroup}>
            <label className={styles.cmsLabel}>Question</label>
            <input
              {...register(`categories.${categoryIndex}.items.${itemIndex}.question`)}
              className={styles.cmsInput}
              placeholder="What is your question?"
            />
            {itemError?.question && (
              <span className={styles.cmsError}>{itemError.question.message}</span>
            )}
          </div>

          <div className={styles.cmsFormGroup}>
            <label className={styles.cmsLabel}>Answer</label>
            <textarea
              {...register(`categories.${categoryIndex}.items.${itemIndex}.answer`)}
              className={styles.cmsTextarea}
              rows={4}
              placeholder="Provide a detailed answer"
            />
            {itemError?.answer && (
              <span className={styles.cmsError}>{itemError.answer.message}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
