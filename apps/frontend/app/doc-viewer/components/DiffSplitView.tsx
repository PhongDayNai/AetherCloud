'use client';

import React from 'react';
import { Asset } from '../../../types';
import { fmtBytes } from '../../../lib/utils';

interface DiffSplitViewProps {
  category: 'markdown' | 'code';
  previewVersion: any;
  asset: Asset;
  mdCompareMode?: 'diff' | 'preview';
  sandboxMode: boolean;
  markdownText: string;
  historyContent: string;
  codeText: string;
  leftLineDiffTypes: Record<number, string>;
  rightLineDiffTypes: Record<number, string>;
  mdDiffRows: any[];
  codeDiffRows: any[];
  mdHighlightedLines: string[];
  highlightedLines: string[];
  currentCompareHighlightedLines: string[];
  historyCompareHighlightedLines: string[];
  previewHtml: string;
  historyPreviewHtml: string;
  leftCodeContainerRef: React.RefObject<HTMLDivElement | null>;
  rightCodeContainerRef: React.RefObject<HTMLDivElement | null>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  handleLeftCodeScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  handleRightCodeScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  getCodeContainerClass: (baseClass: string) => string;
  docTheme: 'light' | 'dark';
  setMarkdownText: (val: string) => void;
  setCodeText: (val: string) => void;
  justifyClass: string;
  t: (key: string, replacements?: Record<string, string | number>) => string;
}

export default function DiffSplitView({
  category,
  previewVersion,
  asset,
  mdCompareMode = 'diff',
  sandboxMode,
  markdownText,
  historyContent,
  codeText,
  leftLineDiffTypes,
  rightLineDiffTypes,
  mdDiffRows,
  codeDiffRows,
  mdHighlightedLines,
  highlightedLines,
  currentCompareHighlightedLines,
  historyCompareHighlightedLines,
  previewHtml,
  historyPreviewHtml,
  leftCodeContainerRef,
  rightCodeContainerRef,
  textareaRef,
  handleLeftCodeScroll,
  handleRightCodeScroll,
  getCodeContainerClass,
  docTheme,
  setMarkdownText,
  setCodeText,
  justifyClass,
  t
}: DiffSplitViewProps): React.JSX.Element {
  if (category === 'markdown') {
    return (
      <div className="splitLayout">
        {mdCompareMode === 'diff' ? (
          <>
            {/* Left: Active Source Code Diff */}
            <div className="leftPane" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="docContentHeader" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', padding: '12px 24px', flexShrink: 0 }}>
                <h3 className="docContentTitle" style={{ fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t('viewer.compareCurrent') || 'Current Version'}
                </h3>
                <div className="docContentMeta" style={{ display: 'flex', gap: '8px', fontSize: '11px', marginTop: '4px', opacity: 0.8 }}>
                  <span>v{asset.version || 1}</span>
                  <span>•</span>
                  <span>{fmtBytes(asset.size)}</span>
                  {asset.uploadedAt && (
                    <>
                      <span>•</span>
                      <span>{new Date(asset.uploadedAt).toLocaleString()}</span>
                    </>
                  )}
                </div>
              </div>
              {!sandboxMode ? (
                <div
                  ref={leftCodeContainerRef}
                  className={getCodeContainerClass('hljs')}
                  onScroll={handleLeftCodeScroll}
                  style={{ flex: 1, overflow: 'auto' }}
                >
                  <div className="codeWrapper">
                    <div className="lineNumbers">
                      {markdownText.split('\n').map((_, i) => {
                        const lineNum = i + 1;
                        const diffType = leftLineDiffTypes[lineNum] || 'normal';
                        return (
                          <div key={i} className={`lineNo diff-line ${diffType}`}>
                            {lineNum}
                          </div>
                        );
                      })}
                    </div>
                    <pre className="codePre" style={{ flex: 1, margin: 0, padding: '24px 16px', overflow: 'visible', position: 'relative' }}>
                      <code className="hljs markdown" style={{ display: 'block', position: 'relative' }}>
                        <div style={{ pointerEvents: 'none' }}>
                          {mdHighlightedLines.map((line, i) => {
                            const lineNum = i + 1;
                            const diffType = leftLineDiffTypes[lineNum] || 'normal';
                            return (
                              <div
                                key={i}
                                className={`codeLine diff-line ${diffType}`}
                                dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }}
                              />
                            );
                          })}
                        </div>
                        <textarea
                          ref={textareaRef}
                          className="editorInput codeEditorInput hljs"
                          value={markdownText}
                          onChange={(e) => setMarkdownText(e.target.value)}
                          spellCheck={false}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            border: 'none',
                            resize: 'none',
                            outline: 'none',
                            background: 'transparent',
                            color: 'transparent',
                            caretColor: docTheme === 'light' ? '#18181b' : '#ffffff',
                            overflow: 'hidden',
                            whiteSpace: 'pre',
                            wordWrap: 'normal',
                            padding: 0,
                            margin: 0,
                            fontFamily: 'inherit',
                            fontSize: 'inherit',
                            lineHeight: 'inherit',
                            zIndex: 2
                          }}
                        />
                      </code>
                    </pre>
                  </div>
                </div>
              ) : (
                <div
                  ref={leftCodeContainerRef}
                  className={getCodeContainerClass('hljs')}
                  onScroll={handleLeftCodeScroll}
                  style={{ flex: 1, overflow: 'auto' }}
                >
                  <div className="codeWrapper">
                    <div className="lineNumbers">
                      {mdDiffRows.map((row, i) => (
                        <div key={i} className={`lineNo diff-line ${row.type === 'added' ? 'diff-empty' : row.type}`}>
                          {row.leftLineNo || ' '}
                        </div>
                      ))}
                    </div>
                    <pre className="codePre" style={{ flex: 1, margin: 0, padding: '24px 16px', overflow: 'visible' }}>
                      <code className="hljs markdown">
                        {mdDiffRows.map((row, i) => (
                          <div
                            key={i}
                            className={`codeLine diff-line ${row.type === 'added' ? 'diff-empty' : row.type}`}
                            style={{ height: '21.6px', lineHeight: '21.6px' }}
                            dangerouslySetInnerHTML={{
                              __html: row.type === 'added' ? '' : (row.leftLineNo ? (currentCompareHighlightedLines[Number(row.leftLineNo) - 1] || ' ') : ' ')
                            }}
                          />
                        ))}
                      </code>
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Right: History Source Code Diff */}
            <div className="rightPane" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="docContentHeader" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', padding: '12px 24px', flexShrink: 0 }}>
                <h3 className="docContentTitle" style={{ fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t('viewer.compareHistory', { ver: previewVersion.versionNumber }) || `History Version v${previewVersion.versionNumber}`}
                </h3>
                <div className="docContentMeta" style={{ display: 'flex', gap: '8px', fontSize: '11px', marginTop: '4px', opacity: 0.8 }}>
                  <span>v{previewVersion.versionNumber}</span>
                  <span>•</span>
                  <span>{previewVersion.size ? fmtBytes(previewVersion.size) : ''}</span>
                  {previewVersion.createdAt && (
                    <>
                      <span>•</span>
                      <span>{new Date(previewVersion.createdAt).toLocaleString()}</span>
                    </>
                  )}
                </div>
              </div>
              <div
                ref={rightCodeContainerRef}
                className={getCodeContainerClass('hljs')}
                onScroll={handleRightCodeScroll}
                style={{ flex: 1, overflow: 'auto' }}
              >
                <div className="codeWrapper">
                  {sandboxMode ? (
                    <>
                      <div className="lineNumbers">
                        {mdDiffRows.map((row, i) => (
                          <div key={i} className={`lineNo diff-line ${row.type === 'deleted' ? 'diff-empty' : row.type}`}>
                            {row.rightLineNo || ' '}
                          </div>
                        ))}
                      </div>
                      <pre className="codePre" style={{ flex: 1, margin: 0, padding: '24px 16px', overflow: 'visible' }}>
                        <code className="hljs markdown">
                          {mdDiffRows.map((row, i) => (
                            <div
                              key={i}
                              className={`codeLine diff-line ${row.type === 'deleted' ? 'diff-empty' : row.type}`}
                              style={{ height: '21.6px', lineHeight: '21.6px' }}
                              dangerouslySetInnerHTML={{
                                __html: row.type === 'deleted' ? '' : (row.rightLineNo ? (historyCompareHighlightedLines[Number(row.rightLineNo) - 1] || ' ') : ' ')
                              }}
                            />
                          ))}
                        </code>
                      </pre>
                    </>
                  ) : (
                    <>
                      <div className="lineNumbers">
                        {historyContent.split('\n').map((_, i) => {
                          const lineNum = i + 1;
                          const diffType = rightLineDiffTypes[lineNum] || 'normal';
                          return (
                            <div key={i} className={`lineNo diff-line ${diffType}`}>
                              {lineNum}
                            </div>
                          );
                        })}
                      </div>
                      <pre className="codePre" style={{ flex: 1, margin: 0, padding: '24px 16px', overflow: 'visible' }}>
                        <code className="hljs markdown">
                          {historyContent.split('\n').map((_, i) => {
                            const lineNum = i + 1;
                            const diffType = rightLineDiffTypes[lineNum] || 'normal';
                            return (
                              <div
                                key={i}
                                className={`codeLine diff-line ${diffType}`}
                                style={{ height: '21.6px', lineHeight: '21.6px' }}
                                dangerouslySetInnerHTML={{
                                  __html: historyCompareHighlightedLines[i] || '&nbsp;'
                                }}
                              />
                            );
                          })}
                        </code>
                      </pre>
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Left: Active HTML Preview */}
            <div className="leftPane" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="docContentHeader" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', padding: '12px 24px', flexShrink: 0 }}>
                <h3 className="docContentTitle" style={{ fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t('viewer.compareCurrent') || 'Current Version'}
                </h3>
                <div className="docContentMeta" style={{ display: 'flex', gap: '8px', fontSize: '11px', marginTop: '4px', opacity: 0.8 }}>
                  <span>v{asset.version || 1}</span>
                  <span>•</span>
                  <span>{fmtBytes(asset.size)}</span>
                  {asset.uploadedAt && (
                    <>
                      <span>•</span>
                      <span>{new Date(asset.uploadedAt).toLocaleString()}</span>
                    </>
                  )}
                </div>
              </div>
              <div
                ref={leftCodeContainerRef}
                onScroll={handleLeftCodeScroll}
                style={{ flex: 1, overflow: 'auto', padding: '24px' }}
              >
                <div
                  className={`previewContainer markdown-body ${justifyClass}`}
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            </div>

            {/* Right: History HTML Preview */}
            <div className="rightPane" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="docContentHeader" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', padding: '12px 24px', flexShrink: 0 }}>
                <h3 className="docContentTitle" style={{ fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t('viewer.compareHistory', { ver: previewVersion.versionNumber }) || `History Version v${previewVersion.versionNumber}`}
                </h3>
                <div className="docContentMeta" style={{ display: 'flex', gap: '8px', fontSize: '11px', marginTop: '4px', opacity: 0.8 }}>
                  <span>v{previewVersion.versionNumber}</span>
                  <span>•</span>
                  <span>{previewVersion.size ? fmtBytes(previewVersion.size) : ''}</span>
                  {previewVersion.createdAt && (
                    <>
                      <span>•</span>
                      <span>{new Date(previewVersion.createdAt).toLocaleString()}</span>
                    </>
                  )}
                </div>
              </div>
              <div
                ref={rightCodeContainerRef}
                onScroll={handleRightCodeScroll}
                style={{ flex: 1, overflow: 'auto', padding: '24px' }}
              >
                <div
                  className={`previewContainer markdown-body ${justifyClass}`}
                  dangerouslySetInnerHTML={{ __html: historyPreviewHtml }}
                />
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Code Category
  return (
    <div className="splitLayout">
      {/* Left Pane: Active Version */}
      <div className="leftPane" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="docContentHeader" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', padding: '12px 24px', flexShrink: 0 }}>
          <h3 className="docContentTitle" style={{ fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {t('viewer.compareCurrent') || 'Current Version'}
          </h3>
          <div className="docContentMeta" style={{ display: 'flex', gap: '8px', fontSize: '11px', marginTop: '4px', opacity: 0.8 }}>
            <span>v{asset.version || 1}</span>
            <span>•</span>
            <span>{fmtBytes(asset.size)}</span>
            {asset.uploadedAt && (
              <>
                <span>•</span>
                <span>{new Date(asset.uploadedAt).toLocaleString()}</span>
              </>
            )}
          </div>
        </div>
        {!sandboxMode ? (
          <div
            ref={leftCodeContainerRef}
            className={getCodeContainerClass('hljs')}
            onScroll={handleLeftCodeScroll}
            style={{ flex: 1, overflow: 'auto' }}
          >
            <div className="codeWrapper">
              <div className="lineNumbers">
                {codeText.split('\n').map((_, i) => {
                  const lineNum = i + 1;
                  const diffType = leftLineDiffTypes[lineNum] || 'normal';
                  return (
                    <div key={i} className={`lineNo diff-line ${diffType}`}>
                      {lineNum}
                    </div>
                  );
                })}
              </div>
              <pre className="codePre" style={{ flex: 1, margin: 0, overflow: 'visible', position: 'relative' }}>
                <code className="hljs" style={{ display: 'block', position: 'relative' }}>
                  <div style={{ pointerEvents: 'none' }}>
                    {highlightedLines.map((line, i) => {
                      const lineNum = i + 1;
                      const diffType = leftLineDiffTypes[lineNum] || 'normal';
                      return (
                        <div
                          key={i}
                          className={`codeLine diff-line ${diffType}`}
                          dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }}
                        />
                      );
                    })}
                  </div>
                  <textarea
                    ref={textareaRef}
                    className="editorInput codeEditorInput hljs"
                    value={codeText}
                    onChange={(e) => setCodeText(e.target.value)}
                    spellCheck={false}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      border: 'none',
                      resize: 'none',
                      outline: 'none',
                      background: 'transparent',
                      color: 'transparent',
                      caretColor: docTheme === 'light' ? '#18181b' : '#ffffff',
                      overflow: 'hidden',
                      whiteSpace: 'pre',
                      wordWrap: 'normal',
                      padding: 0,
                      margin: 0,
                      fontFamily: 'inherit',
                      fontSize: 'inherit',
                      lineHeight: 'inherit',
                      zIndex: 2
                    }}
                  />
                </code>
              </pre>
            </div>
          </div>
        ) : (
          <div
            ref={leftCodeContainerRef}
            className={getCodeContainerClass('hljs')}
            onScroll={handleLeftCodeScroll}
            style={{ flex: 1, overflow: 'auto' }}
          >
            <div className="codeWrapper">
              <div className="lineNumbers">
                {codeDiffRows.map((row, i) => (
                  <div key={i} className={`lineNo diff-line ${row.type === 'added' ? 'diff-empty' : row.type}`}>
                    {row.leftLineNo || ' '}
                  </div>
                ))}
              </div>
              <pre className="codePre" style={{ flex: 1, margin: 0, overflow: 'visible' }}>
                <code className="hljs">
                  {codeDiffRows.map((row, i) => (
                    <div
                      key={i}
                      className={`codeLine diff-line ${row.type === 'added' ? 'diff-empty' : row.type}`}
                      style={{ height: '21.6px', lineHeight: '21.6px' }}
                      dangerouslySetInnerHTML={{
                        __html: row.type === 'added' ? '' : (row.leftLineNo ? (currentCompareHighlightedLines[Number(row.leftLineNo) - 1] || ' ') : ' ')
                      }}
                    />
                  ))}
                </code>
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Right Pane: History Version */}
      <div className="rightPane" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="docContentHeader" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', padding: '12px 24px', flexShrink: 0 }}>
          <h3 className="docContentTitle" style={{ fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {t('viewer.compareHistory', { ver: previewVersion.versionNumber }) || `History Version v${previewVersion.versionNumber}`}
          </h3>
          <div className="docContentMeta" style={{ display: 'flex', gap: '8px', fontSize: '11px', marginTop: '4px', opacity: 0.8 }}>
            <span>v{previewVersion.versionNumber}</span>
            <span>•</span>
            <span>{previewVersion.size ? fmtBytes(previewVersion.size) : ''}</span>
            {previewVersion.createdAt && (
              <>
                <span>•</span>
                <span>{new Date(previewVersion.createdAt).toLocaleString()}</span>
              </>
            )}
          </div>
        </div>
        <div
          ref={rightCodeContainerRef}
          className={getCodeContainerClass('hljs')}
          onScroll={handleRightCodeScroll}
          style={{ flex: 1, overflow: 'auto' }}
        >
          <div className="codeWrapper">
            {sandboxMode ? (
              <>
                <div className="lineNumbers">
                  {codeDiffRows.map((row, i) => (
                    <div key={i} className={`lineNo diff-line ${row.type === 'deleted' ? 'diff-empty' : row.type}`}>
                      {row.rightLineNo || ' '}
                    </div>
                  ))}
                </div>
                <pre className="codePre" style={{ flex: 1, margin: 0, overflow: 'visible' }}>
                  <code className="hljs">
                    {codeDiffRows.map((row, i) => (
                      <div
                        key={i}
                        className={`codeLine diff-line ${row.type === 'deleted' ? 'diff-empty' : row.type}`}
                        style={{ height: '21.6px', lineHeight: '21.6px' }}
                        dangerouslySetInnerHTML={{
                          __html: row.type === 'deleted' ? '' : (row.rightLineNo ? (historyCompareHighlightedLines[Number(row.rightLineNo) - 1] || ' ') : ' ')
                        }}
                      />
                    ))}
                  </code>
                </pre>
              </>
            ) : (
              <>
                <div className="lineNumbers">
                  {historyContent.split('\n').map((_, i) => {
                    const lineNum = i + 1;
                    const diffType = rightLineDiffTypes[lineNum] || 'normal';
                    return (
                      <div key={i} className={`lineNo diff-line ${diffType}`}>
                        {lineNum}
                      </div>
                    );
                  })}
                </div>
                <pre className="codePre" style={{ flex: 1, margin: 0, overflow: 'visible' }}>
                  <code className="hljs">
                    {historyContent.split('\n').map((_, i) => {
                      const lineNum = i + 1;
                      const diffType = rightLineDiffTypes[lineNum] || 'normal';
                      return (
                        <div
                          key={i}
                          className={`codeLine diff-line ${diffType}`}
                          style={{ height: '21.6px', lineHeight: '21.6px' }}
                          dangerouslySetInnerHTML={{
                            __html: historyCompareHighlightedLines[i] || '&nbsp;'
                          }}
                        />
                      );
                    })}
                  </code>
                </pre>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
