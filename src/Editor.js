import ReactQuill from "react-quill";
import { useRef, useMemo } from "react";
import API_BASE_URL from "./config/api";

export default function Editor({value,onChange}) {
  const quillRef = useRef(null);

  // Custom image handler
  const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;

      // Upload image to server
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch(`${API_BASE_URL}/upload-content-image`, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          const imageUrl = data.url;

          // Insert image into editor
          const quill = quillRef.current.getEditor();
          const range = quill.getSelection(true);
          quill.insertEmbed(range.index, 'image', imageUrl);
          quill.setSelection(range.index + 1);
        } else {
          alert('Failed to upload image');
        }
      } catch (error) {
        console.error('Error uploading image:', error);
        alert('Error uploading image');
      }
    };
  };

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [1, 2, false] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [
          { list: 'ordered' },
          { list: 'bullet' },
          { indent: '-1' },
          { indent: '+1' },
        ],
        ['link', 'image'],
        ['clean'],
      ],
      handlers: {
        image: imageHandler
      }
    },
  }), []);

  return (
    <div className="content">
    <ReactQuill
      ref={quillRef}
      value={value}
      theme={'snow'}
      onChange={onChange}
      modules={modules} />
    </div>
  );
}
