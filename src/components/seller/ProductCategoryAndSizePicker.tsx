"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  CATEGORY_GROUPS,
  detectCategoryConfig,
  CategoryGroup,
} from "@/utils/productCategories";
import { Check, Plus, Sparkles, X, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/Input";

interface ProductCategoryAndSizePickerProps {
  category: string;
  onCategoryChange: (category: string) => void;
  selectedSizes: string[];
  onSizesChange: (sizes: string[]) => void;
  categoryError?: string;
}

const QUICK_CATEGORY_CHIPS = [
  { label: "T-Shirt", icon: "👕", category: "T-Shirt" },
  { label: "Shirt", icon: "👔", category: "Shirt" },
  { label: "Jeans", icon: "👖", category: "Jeans" },
  { label: "Formal Pants / Lower", icon: "🩳", category: "Formal Pants" },
  { label: "Shoes / Sneakers", icon: "👟", category: "Sneakers" },
  { label: "Watch", icon: "⌚", category: "Watch" },
  { label: "Sunglasses", icon: "🕶️", category: "Sunglasses" },
  { label: "Perfume", icon: "🧴", category: "Perfume" },
  { label: "Accessories", icon: "💼", category: "Belt" },
];

export function ProductCategoryAndSizePicker({
  category,
  onCategoryChange,
  selectedSizes,
  onSizesChange,
  categoryError,
}: ProductCategoryAndSizePickerProps) {
  const [customSizeInput, setCustomSizeInput] = useState("");
  const [customCategoryInput, setCustomCategoryInput] = useState("");
  const [isCustomCategoryMode, setIsCustomCategoryMode] = useState(false);

  // Detect size configuration based on current category
  const config = useMemo(() => {
    return detectCategoryConfig(category);
  }, [category]);

  // Combine default preset sizes for this category with any extra sizes the seller added
  const displayedSizes = useMemo(() => {
    const set = new Set<string>();
    config.presetSizes.forEach((s) => set.add(s));
    selectedSizes.forEach((s) => set.add(s));
    return Array.from(set);
  }, [config.presetSizes, selectedSizes]);

  const toggleSize = (size: string) => {
    if (selectedSizes.includes(size)) {
      onSizesChange(selectedSizes.filter((s) => s !== size));
    } else {
      onSizesChange([...selectedSizes, size]);
    }
  };

  const handleSelectAll = () => {
    onSizesChange(displayedSizes);
  };

  const handleClearAll = () => {
    onSizesChange([]);
  };

  const handleSetFreeSize = () => {
    onSizesChange(["Free Size"]);
  };

  const handleAddCustomSize = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = customSizeInput.trim();
    if (!trimmed) return;

    if (!selectedSizes.includes(trimmed)) {
      onSizesChange([...selectedSizes, trimmed]);
    }
    setCustomSizeInput("");
  };

  const handleCategorySelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "__CUSTOM__") {
      setIsCustomCategoryMode(true);
      setCustomCategoryInput("");
    } else {
      setIsCustomCategoryMode(false);
      onCategoryChange(val);
    }
  };

  const handleQuickChipClick = (catName: string) => {
    setIsCustomCategoryMode(false);
    onCategoryChange(catName);
  };

  return (
    <div className="space-y-6">
      {/* ── Category Selection ── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <span>Product Category</span>
            <span className="text-red-500">*</span>
          </label>
          <span className="text-xs text-muted-foreground">
            Applies matching sizes & measurements automatically
          </span>
        </div>

        {/* Quick Category Chips */}
        <div className="flex flex-wrap gap-2 pt-0.5">
          {QUICK_CATEGORY_CHIPS.map((chip) => {
            const isActive =
              category?.toLowerCase() === chip.category.toLowerCase() ||
              (chip.label === "Shoes / Sneakers" && /\b(shoe|sneaker|loafers)\b/i.test(category)) ||
              (chip.label === "Formal Pants / Lower" && /\b(formal pants|lower|trousers)\b/i.test(category));

            return (
              <button
                key={chip.label}
                type="button"
                onClick={() => handleQuickChipClick(chip.category)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-xs ring-1 ring-primary"
                    : "bg-background border-border text-foreground hover:bg-muted hover:border-foreground/30"
                }`}
              >
                <span>{chip.icon}</span>
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dropdown with Optgroups */}
        <div className="grid gap-2 sm:grid-cols-2 pt-1">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Select from catalog</label>
            <select
              value={isCustomCategoryMode ? "__CUSTOM__" : category}
              onChange={handleCategorySelectChange}
              className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer font-medium"
            >
              <option value="" disabled>-- Select a Category --</option>
              {CATEGORY_GROUPS.map((group: CategoryGroup) => (
                <optgroup key={group.groupName} label={group.groupName}>
                  {group.categories.map((cat) => (
                    <option key={cat.name} value={cat.name}>
                      {cat.name} ({cat.unitLabel})
                    </option>
                  ))}
                </optgroup>
              ))}
              <option value="__CUSTOM__">✏️ Other / Custom Category (Type your own)...</option>
            </select>
          </div>

          {/* Custom Category Input if selected or manual typing */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">
              {isCustomCategoryMode ? "Custom Category Name" : "Or type custom name"}
            </label>
            <Input
              placeholder="e.g. Leather Jacket, Oxford Shoes, Chronograph..."
              value={category}
              onChange={(e) => {
                onCategoryChange(e.target.value);
              }}
            />
          </div>
        </div>

        {categoryError && (
          <p className="text-sm text-red-500 font-medium">{categoryError}</p>
        )}
      </div>

      {/* ── Dynamic Sizing & Measurements Section ── */}
      <div className="space-y-3 pt-3 border-t border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span>{config.label}</span>
              <span className="text-xs font-normal text-muted-foreground">
                ({config.unitLabel})
              </span>
            </label>
            <p className="text-xs text-muted-foreground">
              Select all sizes in stock for this product.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {config.isAccessory && (
              <button
                type="button"
                onClick={handleSetFreeSize}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                title="Set product as Free Size / Universal Fit"
              >
                <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>Set Free Size</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSelectAll}
              className="text-xs font-medium text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border hover:bg-muted transition-colors cursor-pointer"
            >
              Select All
            </button>

            {selectedSizes.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs font-medium text-destructive hover:underline px-1 py-1 cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Available Size Pills */}
        <div className="flex flex-wrap gap-2 pt-1">
          {displayedSizes.map((size) => {
            const isSelected = selectedSizes.includes(size);
            const isCustom = !config.presetSizes.includes(size);

            return (
              <button
                key={size}
                type="button"
                onClick={() => toggleSize(size)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-foreground text-background border-foreground shadow-xs ring-1 ring-foreground"
                    : "bg-background border-border text-foreground hover:border-foreground/50 hover:bg-secondary/40"
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5" />}
                <span>{size}</span>
                {isCustom && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      onSizesChange(selectedSizes.filter((s) => s !== size));
                    }}
                    className="ml-1 text-muted-foreground hover:text-red-500 p-0.5 rounded cursor-pointer"
                    title="Remove custom size"
                  >
                    <X className="w-3 h-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
          {selectedSizes.length > 0 ? (
            <p className="text-xs font-medium text-primary">
              ✓ {selectedSizes.length} size(s) selected: {selectedSizes.join(", ")}
            </p>
          ) : (
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              ⚠️ No size selected. (Pick at least one size, or click "Set Free Size" for accessories).
            </p>
          )}

          {/* Add Custom Measurement Input */}
          <div className="flex items-center gap-1.5">
            <Input
              placeholder={`Add custom measurement (e.g. ${config.sizeType === "waist" ? "42" : config.sizeType === "footwear" ? "UK 13" : config.sizeType === "volume" ? "250ml" : "Free Size"})...`}
              value={customSizeInput}
              onChange={(e) => setCustomSizeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCustomSize();
                }
              }}
              className="h-8 text-xs max-w-[220px]"
            />
            <button
              type="button"
              onClick={() => handleAddCustomSize()}
              className="h-8 px-3 rounded-md bg-secondary text-secondary-foreground text-xs font-semibold hover:bg-secondary/80 border border-border cursor-pointer transition-colors flex items-center gap-1 shrink-0"
            >
              <Plus className="w-3 h-3" />
              <span>Add</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

