import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Type,
  Highlighter,
} from 'lucide-react';

export interface NoteRichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

const AVAILABLE_FONTS = [
  { name: 'Inter', value: 'Inter, sans-serif' },
  { name: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { name: 'Roboto', value: 'Roboto, sans-serif' },
  { name: 'Calibri', value: 'Calibri, sans-serif' },
  { name: 'Georgia', value: 'Georgia, serif' },
  { name: 'Times New Roman', value: '"Times New Roman", Times, serif' },
];

const AVAILABLE_SIZES = [12, 14, 16, 18, 20, 24, 28, 32];

const PRESET_COLORS = [
  { label: 'Padrão (Escuro)', color: '#1e293b' },
  { label: 'Azul Fênix', color: '#0052cc' },
  { label: 'Azul Marinho', color: '#0B2046' },
  { label: 'Verde', color: '#16a34a' },
  { label: 'Vermelho', color: '#dc2626' },
  { label: 'Laranja', color: '#ea580c' },
  { label: 'Roxo', color: '#9333ea' },
  { label: 'Cinza', color: '#64748b' },
];

const PRESET_HIGHLIGHTS = [
  { label: 'Sem fundo (Remover destaque)', color: 'transparent', preview: '#f1f5f9' },
  { label: 'Amarelo Destaque', color: '#fef08a', preview: '#fef08a' },
  { label: 'Verde Suave', color: '#bbf7d0', preview: '#bbf7d0' },
  { label: 'Azul Suave', color: '#bfdbfe', preview: '#bfdbfe' },
  { label: 'Rosa Suave', color: '#fbcfe8', preview: '#fbcfe8' },
  { label: 'Laranja Suave', color: '#fed7aa', preview: '#fed7aa' },
  { label: 'Roxo Suave', color: '#e9d5ff', preview: '#e9d5ff' },
];

/**
 * Converte Markdown legado (ex: **texto**, *texto*, listas) em HTML limpo
 */
export function convertMarkdownToHtml(input: string): string {
  if (!input) return '';
  
  // Se já contém HTML rico típico (tags como <strong>, <b>, <em>, <p>, <div>, <span>, <ul>, <ol>, <br>),
  // trata apenas possíveis quebras de linha ou marcações soltas
  let text = input;

  // Substitui negrito Markdown **texto** ou __texto__
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__(.*?)__/g, '<strong>$1</strong>');

  // Substitui itálico Markdown *texto* ou _texto_ (evitando tags HTML)
  text = text.replace(/(?<!<[^>]*)\*([^*<>\n]+)\*(?![^<]*>)/g, '<em>$1</em>');
  text = text.replace(/(?<!<[^>]*)(?<!\w)_([^_<>\n]+)_(?!\w)(?![^<]*>)/g, '<em>$1</em>');

  // Se não tem tags de bloco HTML (p, div, ul, ol, br), converter \n em <br/>
  const hasBlockTags = /<(p|div|ul|ol|li|h[1-6]|br)[^>]*>/i.test(text);
  if (!hasBlockTags) {
    text = text
      .split('\n')
      .map((line) => line.trimEnd())
      .join('<br>');
  }

  return text;
}

export const NoteRichTextEditor: React.FC<NoteRichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Digite o conteúdo da anotação com formatação rica...',
  minHeight = '180px',
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastHtmlRef = useRef<string>('');
  const [selectedFont, setSelectedFont] = useState('Inter, sans-serif');
  const [selectedSize, setSelectedSize] = useState<number>(14);
  const [selectedColor, setSelectedColor] = useState<string>('#1e293b');
  const [showColorMenu, setShowColorMenu] = useState(false);
  const colorMenuRef = useRef<HTMLDivElement>(null);

  const [selectedHighlight, setSelectedHighlight] = useState<string>('transparent');
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const highlightMenuRef = useRef<HTMLDivElement>(null);

  // Fecha menus de cores e destaque ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorMenuRef.current && !colorMenuRef.current.contains(e.target as Node)) {
        setShowColorMenu(false);
      }
      if (highlightMenuRef.current && !highlightMenuRef.current.contains(e.target as Node)) {
        setShowHighlightMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sincroniza valor inicial ou externo
  useEffect(() => {
    const formatted = convertMarkdownToHtml(value || '');
    if (editorRef.current && formatted !== lastHtmlRef.current) {
      editorRef.current.innerHTML = formatted;
      lastHtmlRef.current = formatted;
    }
  }, [value]);

  const triggerChange = useCallback(() => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    lastHtmlRef.current = html;
    onChange(html);
  }, [onChange]);

  const execCommand = (command: string, arg?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    triggerChange();
  };

  const handleFontChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const font = e.target.value;
    setSelectedFont(font);
    editorRef.current?.focus();
    document.execCommand('fontName', false, font);
    triggerChange();
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const size = parseInt(e.target.value, 10);
    setSelectedSize(size);
    editorRef.current?.focus();

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && !selection.getRangeAt(0).collapsed) {
      document.execCommand('fontSize', false, '7');
      if (editorRef.current) {
        const fontTags = editorRef.current.getElementsByTagName('font');
        for (let i = 0; i < fontTags.length; i++) {
          const el = fontTags[i];
          if (el.getAttribute('size') === '7') {
            el.removeAttribute('size');
            el.style.fontSize = `${size}px`;
          }
        }
      }
    } else {
      if (editorRef.current) {
        editorRef.current.style.fontSize = `${size}px`;
      }
    }
    triggerChange();
  };

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    setShowColorMenu(false);
    editorRef.current?.focus();
    document.execCommand('foreColor', false, color);
    triggerChange();
  };

  const handleHighlightSelect = (color: string) => {
    editorRef.current?.focus();
    if (!color || color === 'transparent') {
      document.execCommand('hiliteColor', false, 'transparent');
      document.execCommand('backColor', false, 'transparent');
      setSelectedHighlight('transparent');
    } else {
      document.execCommand('hiliteColor', false, color);
      document.execCommand('backColor', false, color);
      setSelectedHighlight(color);
    }
    setShowHighlightMenu(false);
    triggerChange();
  };

  return (
    <div className="w-full border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
      {/* Barra de Ferramentas Rica */}
      <div
        id="note-editor-toolbar"
        className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 border-b border-slate-200 select-none"
      >
        {/* Escolha de Fonte */}
        <div className="flex items-center gap-1 mr-1">
          <Type className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={selectedFont}
            onChange={handleFontChange}
            onMouseDown={(e) => e.stopPropagation()}
            title="Fonte"
            className="text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            {AVAILABLE_FONTS.map((f) => (
              <option key={f.name} value={f.value}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        {/* Tamanho da Fonte */}
        <div className="flex items-center gap-1 mr-1.5">
          <select
            value={selectedSize}
            onChange={handleFontSizeChange}
            onMouseDown={(e) => e.stopPropagation()}
            title="Tamanho da Fonte"
            className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-md py-1 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            {AVAILABLE_SIZES.map((sz) => (
              <option key={sz} value={sz}>
                {sz} px
              </option>
            ))}
          </select>
        </div>

        <div className="w-[1px] h-5 bg-slate-200 mx-0.5" />

        {/* Formatação Básica: Negrito, Itálico, Sublinhado */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execCommand('bold');
          }}
          title="Negrito (Ctrl+B)"
          className="p-1.5 rounded-md hover:bg-white text-slate-700 hover:text-blue-600 hover:shadow-xs transition-all"
        >
          <Bold className="w-4 h-4" />
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execCommand('italic');
          }}
          title="Itálico (Ctrl+I)"
          className="p-1.5 rounded-md hover:bg-white text-slate-700 hover:text-blue-600 hover:shadow-xs transition-all"
        >
          <Italic className="w-4 h-4" />
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execCommand('underline');
          }}
          title="Sublinhado (Ctrl+U)"
          className="p-1.5 rounded-md hover:bg-white text-slate-700 hover:text-blue-600 hover:shadow-xs transition-all"
        >
          <Underline className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-slate-200 mx-0.5" />

        {/* Listas: Marcadores e Numerada */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execCommand('insertUnorderedList');
          }}
          title="Lista com Marcadores"
          className="p-1.5 rounded-md hover:bg-white text-slate-700 hover:text-blue-600 hover:shadow-xs transition-all"
        >
          <List className="w-4 h-4" />
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execCommand('insertOrderedList');
          }}
          title="Lista Numerada"
          className="p-1.5 rounded-md hover:bg-white text-slate-700 hover:text-blue-600 hover:shadow-xs transition-all"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-slate-200 mx-0.5" />

        {/* Alinhamento: Esquerda, Centro, Direita */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execCommand('justifyLeft');
          }}
          title="Alinhar à Esquerda"
          className="p-1.5 rounded-md hover:bg-white text-slate-700 hover:text-blue-600 hover:shadow-xs transition-all"
        >
          <AlignLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execCommand('justifyCenter');
          }}
          title="Centralizar"
          className="p-1.5 rounded-md hover:bg-white text-slate-700 hover:text-blue-600 hover:shadow-xs transition-all"
        >
          <AlignCenter className="w-4 h-4" />
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execCommand('justifyRight');
          }}
          title="Alinhar à Direita"
          className="p-1.5 rounded-md hover:bg-white text-slate-700 hover:text-blue-600 hover:shadow-xs transition-all"
        >
          <AlignRight className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-slate-200 mx-0.5" />

        {/* Cor do Texto com seletor popover */}
        <div className="relative" ref={colorMenuRef}>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setShowColorMenu(!showColorMenu);
            }}
            title="Cor do Texto"
            className="flex items-center gap-1 p-1.5 rounded-md hover:bg-white text-slate-700 hover:shadow-xs transition-all"
          >
            <Palette className="w-4 h-4" style={{ color: selectedColor }} />
            <span
              className="w-3 h-3 rounded-full border border-slate-300"
              style={{ backgroundColor: selectedColor }}
            />
          </button>

          {showColorMenu && (
            <div className="absolute left-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-2.5 z-50 flex flex-col gap-2 min-w-[170px]">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Cor do Texto
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {PRESET_COLORS.map((pc) => (
                  <button
                    key={pc.color}
                    type="button"
                    title={pc.label}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleColorSelect(pc.color);
                    }}
                    className="w-6 h-6 rounded-full border border-slate-300 hover:scale-110 transition-transform flex items-center justify-center"
                    style={{ backgroundColor: pc.color }}
                  />
                ))}
              </div>
              <div className="pt-1 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-600 font-medium">Personalizada</span>
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => handleColorSelect(e.target.value)}
                  className="w-6 h-6 p-0 border-0 rounded cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Fundo Destacado (Marca-texto / Highlight) */}
        <div className="relative" ref={highlightMenuRef}>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setShowHighlightMenu(!showHighlightMenu);
            }}
            title="Cor de Fundo / Destaque do Texto"
            className="flex items-center gap-1 p-1.5 rounded-md hover:bg-white text-slate-700 hover:shadow-xs transition-all"
          >
            <Highlighter className="w-4 h-4 text-amber-500" />
            <span
              className="w-3 h-3 rounded-full border border-slate-300"
              style={{ backgroundColor: selectedHighlight === 'transparent' ? '#ffffff' : selectedHighlight }}
            />
          </button>

          {showHighlightMenu && (
            <div className="absolute left-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-2.5 z-50 flex flex-col gap-2 min-w-[200px]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Fundo Destacado
                </span>
                {selectedHighlight !== 'transparent' && (
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleHighlightSelect('transparent');
                    }}
                    className="text-[11px] text-rose-600 hover:underline font-semibold"
                  >
                    Remover
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-1">
                {PRESET_HIGHLIGHTS.map((ph) => {
                  const isSelected = selectedHighlight === ph.color;
                  return (
                    <button
                      key={ph.color}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleHighlightSelect(ph.color);
                      }}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors text-left ${
                        isSelected ? 'bg-slate-100 font-bold' : ''
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded border border-slate-300 flex-shrink-0"
                        style={{ backgroundColor: ph.preview }}
                      />
                      <span>{ph.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Área de Edição Rica (contentEditable) */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={triggerChange}
        onBlur={triggerChange}
        data-placeholder={placeholder}
        style={{
          minHeight,
          fontFamily: selectedFont,
        }}
        className="rich-text-editor p-3.5 text-sm text-slate-800 leading-relaxed outline-none focus:outline-none overflow-y-auto max-h-[360px]"
      />
    </div>
  );
};
