import { useState, useEffect, useRef } from 'react';
import API_BASE_URL from '../config/api';

export default function TagInput({ selectedTags, onTagsChange }) {
  const [allTags, setAllTags] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredTags, setFilteredTags] = useState([]);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Fetch all existing tags
  useEffect(() => {
    fetch(`${API_BASE_URL}/tags`)
      .then(response => response.json())
      .then(tags => {
        // Extract just the tag names from the response
        const tagNames = tags.map(tag => typeof tag === 'string' ? tag : tag.name);
        setAllTags(tagNames);
      })
      .catch(err => console.error('Failed to fetch tags:', err));
  }, []);

  // Filter tags based on input
  useEffect(() => {
    if (inputValue.trim()) {
      const filtered = allTags.filter(tag => 
        tag.toLowerCase().includes(inputValue.toLowerCase()) &&
        !selectedTags.includes(tag)
      );
      setFilteredTags(filtered);
    } else {
      setFilteredTags(allTags.filter(tag => !selectedTags.includes(tag)));
    }
  }, [inputValue, allTags, selectedTags]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function addTag(tag) {
    if (tag.trim() && !selectedTags.includes(tag.trim())) {
      onTagsChange([...selectedTags, tag.trim()]);
      setInputValue('');
      setShowDropdown(false);
    }
  }

  function removeTag(tagToRemove) {
    onTagsChange(selectedTags.filter(tag => tag !== tagToRemove));
  }

  function handleInputChange(e) {
    setInputValue(e.target.value);
    setShowDropdown(true);
  }

  function handleInputKeyDown(e) {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && selectedTags.length > 0) {
      removeTag(selectedTags[selectedTags.length - 1]);
    }
  }

  function handleCreateNew() {
    if (inputValue.trim()) {
      addTag(inputValue);
    }
  }

  return (
    <div style={{ position: 'relative', marginBottom: '10px' }}>
      {/* Selected Tags Display */}
      <div style={{
        border: '1px solid #ddd',
        borderRadius: '5px',
        padding: '8px',
        minHeight: '42px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '5px',
        alignItems: 'center',
        backgroundColor: 'white'
      }}>
        {selectedTags.map((tag, index) => (
          <span
            key={index}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: '#007BFF',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '15px',
              fontSize: '14px',
              gap: '5px'
            }}
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '0',
                marginLeft: '2px',
                fontSize: '16px',
                lineHeight: '1'
              }}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onFocus={() => setShowDropdown(true)}
          placeholder={selectedTags.length === 0 ? 'Add tags...' : ''}
          style={{
            border: 'none',
            outline: 'none',
            flex: '1',
            minWidth: '120px',
            fontSize: '14px',
            padding: '4px'
          }}
        />
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '5px',
            marginTop: '2px',
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 1000,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          {/* Create new option */}
          {inputValue.trim() && !allTags.includes(inputValue.trim()) && (
            <div
              onClick={handleCreateNew}
              style={{
                padding: '10px',
                cursor: 'pointer',
                borderBottom: '1px solid #eee',
                backgroundColor: '#f8f9fa'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#e9ecef'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#f8f9fa'}
            >
              <strong>Create new:</strong> "{inputValue}"
            </div>
          )}

          {/* Existing tags */}
          {filteredTags.length > 0 ? (
            filteredTags.map((tag, index) => (
              <div
                key={index}
                onClick={() => addTag(tag)}
                style={{
                  padding: '10px',
                  cursor: 'pointer',
                  borderBottom: index < filteredTags.length - 1 ? '1px solid #eee' : 'none'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f0f0'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
              >
                {tag}
              </div>
            ))
          ) : !inputValue.trim() ? (
            <div style={{ padding: '10px', color: '#999', textAlign: 'center' }}>
              {allTags.length === 0 ? 'No tags yet' : 'All tags already selected'}
            </div>
          ) : null}

          {/* No results */}
          {filteredTags.length === 0 && !inputValue.trim() && selectedTags.length === allTags.length && allTags.length > 0 && (
            <div style={{ padding: '10px', color: '#999', textAlign: 'center' }}>
              All tags selected
            </div>
          )}
        </div>
      )}
    </div>
  );
}
