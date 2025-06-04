"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, Command } from "lucide-react";
import { cn } from "@/lib/utils";
import { Film } from "./types";
import dayjs from "dayjs";

interface Section {
  id: string;
  name: string;
}

interface SearchSuggestion {
  type: 'syntax' | 'date' | 'time' | 'category' | 'title' | 'director';
  value: string;
  label: string;
  description?: string;
}

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  films?: Film[];
  sections?: Section[];
}

export function SearchInput({ 
  value, 
  onChange, 
  placeholder = "搜尋影片...", 
  className,
  films = [],
  sections = []
}: SearchInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Generate suggestions based on current input
  const suggestions = useMemo(() => {
    if (!value.trim()) {
      // Show basic syntax help when empty
      return [
        { type: 'syntax' as const, value: 'date:', label: 'date:', description: '依日期篩選 (例: date:2023-11-15)' },
        { type: 'syntax' as const, value: 'time:', label: 'time:', description: '依時間篩選 (例: time>18:00)' },
        { type: 'syntax' as const, value: 'category:', label: 'category:', description: '依類別篩選' },
        { type: 'syntax' as const, value: 'title:', label: 'title:', description: '依片名篩選' },
        { type: 'syntax' as const, value: 'director:', label: 'director:', description: '依導演篩選' },
      ];
    }

    const suggestions: SearchSuggestion[] = [];
    const words = value.split(/\s+/);
    const lastWord = words[words.length - 1];

    // Check if we're in the middle of typing a filter
    if (lastWord.includes(':')) {
      const [filterType, filterValue] = lastWord.split(':', 2);
      
      switch (filterType.toLowerCase()) {
        case 'date':
          // Suggest common date patterns
          const today = dayjs();
          const tomorrow = today.add(1, 'day');
          suggestions.push(
            { type: 'date' as const, value: `date:${today.format('YYYY-MM-DD')}`, label: `date:${today.format('YYYY-MM-DD')}`, description: '今天' },
            { type: 'date' as const, value: `date:${tomorrow.format('YYYY-MM-DD')}`, label: `date:${tomorrow.format('YYYY-MM-DD')}`, description: '明天' },
            { type: 'date' as const, value: `date>${today.format('YYYY-MM-DD')}`, label: `date>${today.format('YYYY-MM-DD')}`, description: '今天之後' }
          );
          break;
          
        case 'time':
          // Suggest common times
          const commonTimes = ['09:00', '12:00', '14:00', '16:00', '18:00', '19:00', '20:00', '21:00'];
          commonTimes.forEach(time => {
            if (!filterValue || time.includes(filterValue)) {
              suggestions.push(
                { type: 'time' as const, value: `time:${time}`, label: `time:${time}`, description: '精確時間' },
                { type: 'time' as const, value: `time>${time}`, label: `time>${time}`, description: '此時間之後' },
                { type: 'time' as const, value: `time<${time}`, label: `time<${time}`, description: '此時間之前' }
              );
            }
          });
          break;
          
        case 'category':
          // Suggest available categories
          sections.forEach(section => {
            if (!filterValue || section.name.toLowerCase().includes(filterValue.toLowerCase())) {
              suggestions.push({
                type: 'category' as const,
                value: `category:${section.name}`,
                label: `category:${section.name}`,
                description: '類別篩選'
              });
            }
          });
          break;
          
        case 'title':
          // Suggest film titles
          const titleMatches = films
            .filter(film => 
              !filterValue || 
              film.filmTitle.toLowerCase().includes(filterValue.toLowerCase()) ||
              film.filmOriginalTitle.toLowerCase().includes(filterValue.toLowerCase())
            )
            .slice(0, 5); // Limit to 5 suggestions
            
          titleMatches.forEach(film => {
            suggestions.push({
              type: 'title' as const,
              value: `title:"${film.filmTitle}"`,
              label: `title:"${film.filmTitle}"`,
              description: '片名搜尋'
            });
          });
          break;
          
        case 'director':
          // Suggest director names
          const directorSet = new Set<string>();
          films.forEach(film => {
            if (film.directorName && (!filterValue || film.directorName.toLowerCase().includes(filterValue.toLowerCase()))) {
              directorSet.add(film.directorName);
            }
            if (film.directorOriginalName && (!filterValue || film.directorOriginalName.toLowerCase().includes(filterValue.toLowerCase()))) {
              directorSet.add(film.directorOriginalName);
            }
          });
          
          Array.from(directorSet).slice(0, 5).forEach(director => {
            suggestions.push({
              type: 'director' as const,
              value: `director:"${director}"`,
              label: `director:"${director}"`,
              description: '導演搜尋'
            });
          });
          break;
      }
    } else {
      // Suggest syntax completions
      const syntaxSuggestions = [
        { prefix: 'date:', description: '依日期篩選' },
        { prefix: 'time:', description: '依時間篩選' },
        { prefix: 'category:', description: '依類別篩選' },
        { prefix: 'title:', description: '依片名篩選' },
        { prefix: 'director:', description: '依導演篩選' },
      ];
      
      syntaxSuggestions.forEach(({ prefix, description }) => {
        if (prefix.toLowerCase().includes(lastWord.toLowerCase())) {
          suggestions.push({
            type: 'syntax' as const,
            value: prefix,
            label: prefix,
            description
          });
        }
      });
    }

    return suggestions.slice(0, 8); // Limit total suggestions
  }, [value, films, sections]);

  const handleSuggestionSelect = useCallback((suggestion: SearchSuggestion) => {
    const words = value.split(/\s+/);
    const lastWord = words[words.length - 1];
    
    let newValue: string;
    
    if (suggestion.type === 'syntax' && !lastWord.includes(':')) {
      // Replace the last word with the syntax
      words[words.length - 1] = suggestion.value;
      newValue = words.join(' ');
    } else if (lastWord.includes(':')) {
      // Replace the current filter
      words[words.length - 1] = suggestion.value;
      newValue = words.join(' ');
    } else {
      // Append the suggestion
      newValue = value.trim() + (value.trim() ? ' ' : '') + suggestion.value;
    }
    
    onChange(newValue);
    setIsOpen(false);
    setSelectedIndex(0);
    
    // Focus back to input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }, [value, onChange]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || suggestions.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % suggestions.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (suggestions[selectedIndex]) {
            handleSuggestionSelect(suggestions[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, suggestions, selectedIndex, handleSuggestionSelect]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsOpen(newValue.trim().length > 0);
    setSelectedIndex(0);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setIsOpen(true);
    }
  };

  const clearSearch = () => {
    onChange("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <Popover open={isOpen && suggestions.length > 0} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            ref={inputRef}
            value={value}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            placeholder={placeholder}
            className={cn("pr-8", className)}
          />
          {value.length > 0 && (
            <button
              onClick={clearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <X size={14} className="text-muted-foreground" />
            </button>
          )}
        </div>
      </PopoverTrigger>
      
      <PopoverContent 
        ref={popoverRef}
        className="w-[400px] p-0" 
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="max-h-[300px] overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.type}-${suggestion.value}`}
              onClick={() => handleSuggestionSelect(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 cursor-pointer border-b border-border/50 last:border-b-0",
                {
                  "bg-muted": index === selectedIndex,
                }
              )}
            >
              <div className="flex items-center gap-2 flex-1">
                <Command size={14} className="text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm truncate">{suggestion.label}</div>
                  {suggestion.description && (
                    <div className="text-xs text-muted-foreground truncate">{suggestion.description}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="px-3 py-2 border-t border-border/50 bg-muted/30">
          <div className="text-xs text-muted-foreground">
            使用 ↑↓ 選擇，Enter 確認，Esc 關閉
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}