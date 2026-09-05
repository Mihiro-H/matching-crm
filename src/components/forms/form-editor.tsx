"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePageBreadcrumbs } from "@/components/layout/page-header-context";
import {
  addBuiltinField,
  addCustomField,
  moveField,
  removeField,
  renameForm,
  updateField,
} from "@/lib/forms/actions";
import { BUILTIN_FIELDS } from "@/lib/forms/builtin-fields";
import type { FormDetail } from "@/lib/forms/get-form";
import type { FormFieldRow } from "@/lib/forms/types";
import type { FormAnswerType } from "@/lib/supabase/database.types";

const ANSWER_TYPE_LABELS: Record<FormAnswerType, string> = {
  text: "1行テキスト",
  textarea: "複数行テキスト",
  single_select: "単一選択",
  multi_select: "複数選択",
};

/** フォーム管理: フォーム編集画面(SCREEN_SPEC.md)。 */
export function FormEditor({ form }: { form: FormDetail }) {
  const router = useRouter();
  usePageBreadcrumbs([{ label: "フォーム管理", href: "/forms" }, { label: form.name }]);

  const [name, setName] = useState(form.name);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [showAddField, setShowAddField] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addedBuiltinKeys = new Set(form.fields.filter((f) => f.isBuiltin).map((f) => f.fieldKey));
  const availableBuiltins = BUILTIN_FIELDS.filter((f) => !addedBuiltinKeys.has(f.key));

  function refresh() {
    router.refresh();
  }

  async function handleSaveName() {
    setIsSavingName(true);
    const result = await renameForm(form.id, name);
    setIsSavingName(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setIsEditingName(false);
    refresh();
  }

  async function handleAddBuiltin(key: string) {
    setError(null);
    const result = await addBuiltinField(form.id, key as (typeof BUILTIN_FIELDS)[number]["key"]);
    if (!result.success) setError(result.error);
    else refresh();
  }

  async function handleMove(fieldId: string, direction: "up" | "down") {
    setError(null);
    const result = await moveField(form.id, fieldId, direction);
    if (!result.success) setError(result.error);
    else refresh();
  }

  async function handleRemove(fieldId: string) {
    setError(null);
    const result = await removeField(fieldId);
    if (!result.success) setError(result.error);
    else refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
        <div className="flex items-center justify-between">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
              <button
                type="button"
                disabled={isSavingName}
                onClick={handleSaveName}
                className="rounded-md bg-primary-500 px-3 py-1.5 text-sm text-neutral-0 disabled:opacity-40"
              >
                保存
              </button>
              <button
                type="button"
                onClick={() => {
                  setName(form.name);
                  setIsEditingName(false);
                }}
                className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:bg-page-bg"
              >
                キャンセル
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <h2 className="text-lg text-neutral-900">{form.name}</h2>
              <button
                type="button"
                onClick={() => setIsEditingName(true)}
                className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:bg-page-bg"
              >
                編集
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-1 rounded-md border border-neutral-100 bg-page-bg p-3 text-xs text-neutral-600">
          <p>公開フォーム(別ドメイン)から利用する連携先:</p>
          <p>
            送信先(POST、要 X-Webhook-Secret ヘッダー):{" "}
            <code className="text-neutral-900">/api/webhooks/form/{form.id}</code>
          </p>
          <p>
            構成取得用(GET、認証不要・CORS許可済み): <code className="text-neutral-900">/api/forms/{form.id}/schema</code>
          </p>
          <p>
            デザイントークン(CSS変数): <code className="text-neutral-900">/design-tokens.css</code>
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-danger-text">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-neutral-600">
              <th className="px-4 py-3 font-medium">順序</th>
              <th className="px-4 py-3 font-medium">項目名</th>
              <th className="px-4 py-3 font-medium">対応項目</th>
              <th className="px-4 py-3 font-medium">回答方式</th>
              <th className="px-4 py-3 font-medium">必須</th>
              <th className="px-4 py-3 font-medium">選択肢</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {form.fields.map((field, index) => (
              <FieldRow
                key={field.id}
                field={field}
                isFirst={index === 0}
                isLast={index === form.fields.length - 1}
                onMove={(direction) => handleMove(field.id, direction)}
                onRemove={() => handleRemove(field.id)}
                onChanged={refresh}
              />
            ))}
            {form.fields.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-neutral-600">
                  項目がまだありません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowAddField((v) => !v)}
          className="rounded-md border border-neutral-200 bg-neutral-0 px-4 py-2 text-sm text-neutral-600 hover:bg-page-bg"
        >
          {showAddField ? "閉じる" : "+項目を追加"}
        </button>
      </div>

      {showAddField && (
        <AddFieldPanel
          formId={form.id}
          availableBuiltins={availableBuiltins}
          onAddBuiltin={handleAddBuiltin}
          onAdded={() => {
            setShowAddField(false);
            refresh();
          }}
          onError={setError}
        />
      )}
    </div>
  );
}

function FieldRow({
  field,
  isFirst,
  isLast,
  onMove,
  onRemove,
  onChanged,
}: {
  field: FormFieldRow;
  isFirst: boolean;
  isLast: boolean;
  onMove: (direction: "up" | "down") => void;
  onRemove: () => void;
  onChanged: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(field.label);
  const [isRequired, setIsRequired] = useState(field.isRequired);
  const [optionsText, setOptionsText] = useState((field.options ?? []).map((o) => o.label).join("\n"));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasOptions = field.answerType === "single_select" || field.answerType === "multi_select";
  const canRemove = !(field.isBuiltin && field.fieldKey === "name");

  function handleCancel() {
    setLabel(field.label);
    setIsRequired(field.isRequired);
    setOptionsText((field.options ?? []).map((o) => o.label).join("\n"));
    setError(null);
    setIsEditing(false);
  }

  async function handleSave() {
    setError(null);
    setIsSubmitting(true);
    const result = await updateField(field.id, {
      label,
      isRequired,
      options: hasOptions ? optionsText.split("\n") : null,
    });
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setIsEditing(false);
    onChanged();
  }

  return (
    <tr className="border-b border-neutral-100 last:border-0">
      <td className="px-4 py-3 align-top">
        <div className="flex flex-col gap-1">
          <button
            type="button"
            disabled={isFirst}
            onClick={() => onMove("up")}
            aria-label="上に移動"
            className="text-neutral-600 hover:text-primary-600 disabled:opacity-30"
          >
            ▲
          </button>
          <button
            type="button"
            disabled={isLast}
            onClick={() => onMove("down")}
            aria-label="下に移動"
            className="text-neutral-600 hover:text-primary-600 disabled:opacity-30"
          >
            ▼
          </button>
        </div>
      </td>
      <td className="px-4 py-3 align-top text-neutral-900">
        {isEditing ? (
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-40 rounded-md border border-neutral-200 bg-neutral-0 px-2 py-1 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        ) : (
          field.label
        )}
        {error && <p className="mt-1 text-xs text-danger-text">{error}</p>}
      </td>
      <td className="px-4 py-3 align-top text-neutral-600">
        {field.isBuiltin ? `CRM項目(${field.fieldKey})` : "新規項目"}
      </td>
      <td className="px-4 py-3 align-top text-neutral-600">{ANSWER_TYPE_LABELS[field.answerType]}</td>
      <td className="px-4 py-3 align-top">
        {isEditing ? (
          <input
            type="checkbox"
            checked={isRequired}
            onChange={(e) => setIsRequired(e.target.checked)}
            className="h-4 w-4 rounded border-neutral-200 text-primary-500 focus:ring-primary-100"
          />
        ) : (
          <span className="text-neutral-600">{field.isRequired ? "必須" : "任意"}</span>
        )}
      </td>
      <td className="px-4 py-3 align-top text-neutral-600">
        {hasOptions ? (
          isEditing ? (
            <textarea
              value={optionsText}
              onChange={(e) => setOptionsText(e.target.value)}
              rows={3}
              placeholder="1行に1つずつ入力"
              className="w-40 rounded-md border border-neutral-200 bg-neutral-0 px-2 py-1 text-xs text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          ) : (
            (field.options ?? []).map((o) => o.label).join(" / ") || "-"
          )
        ) : (
          "-"
        )}
      </td>
      <td className="px-4 py-3 align-top">
        <div className="flex flex-wrap gap-2">
          {isEditing ? (
            <>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSave}
                className="text-xs text-primary-600 hover:underline disabled:opacity-40"
              >
                保存
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleCancel}
                className="text-xs text-neutral-600 hover:underline disabled:opacity-40"
              >
                キャンセル
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setIsEditing(true)} className="text-xs text-primary-600 hover:underline">
              編集
            </button>
          )}
          {canRemove && (
            <button type="button" onClick={onRemove} className="text-xs text-danger-text hover:underline">
              削除
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function AddFieldPanel({
  formId,
  availableBuiltins,
  onAddBuiltin,
  onAdded,
  onError,
}: {
  formId: string;
  availableBuiltins: typeof BUILTIN_FIELDS;
  onAddBuiltin: (key: string) => void;
  onAdded: () => void;
  onError: (message: string) => void;
}) {
  const [mode, setMode] = useState<"builtin" | "custom">(availableBuiltins.length > 0 ? "builtin" : "custom");
  const [builtinKey, setBuiltinKey] = useState<string>(availableBuiltins[0]?.key ?? "");
  const [label, setLabel] = useState("");
  const [answerType, setAnswerType] = useState<FormAnswerType>("text");
  const [optionsText, setOptionsText] = useState("");
  const [isRequired, setIsRequired] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const needsOptions = answerType === "single_select" || answerType === "multi_select";

  async function handleAddCustom() {
    setIsSubmitting(true);
    const result = await addCustomField(formId, {
      label,
      answerType,
      options: needsOptions ? optionsText.split("\n") : [],
      isRequired,
    });
    setIsSubmitting(false);
    if (!result.success) {
      onError(result.error);
      return;
    }
    onAdded();
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("builtin")}
          disabled={availableBuiltins.length === 0}
          className={`rounded-full px-3 py-1 text-sm disabled:opacity-30 ${
            mode === "builtin" ? "bg-primary-500 text-neutral-0" : "border border-neutral-200 text-neutral-600"
          }`}
        >
          既存のCRM項目から選ぶ
        </button>
        <button
          type="button"
          onClick={() => setMode("custom")}
          className={`rounded-full px-3 py-1 text-sm ${
            mode === "custom" ? "bg-primary-500 text-neutral-0" : "border border-neutral-200 text-neutral-600"
          }`}
        >
          新しい項目を追加
        </button>
      </div>

      {mode === "builtin" ? (
        <div className="mt-4 flex items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-neutral-600">項目</span>
            <select
              value={builtinKey}
              onChange={(e) => setBuiltinKey(e.target.value)}
              className="w-48 rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              {availableBuiltins.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.defaultLabel}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={!builtinKey}
            onClick={() => onAddBuiltin(builtinKey)}
            className="rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0 disabled:opacity-40"
          >
            追加
          </button>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-neutral-600">項目名</span>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-64 rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-neutral-600">回答方式</span>
            <select
              value={answerType}
              onChange={(e) => setAnswerType(e.target.value as FormAnswerType)}
              className="w-48 rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              {Object.entries(ANSWER_TYPE_LABELS).map(([value, label2]) => (
                <option key={value} value={value}>
                  {label2}
                </option>
              ))}
            </select>
          </label>
          {needsOptions && (
            <label className="flex flex-col gap-1">
              <span className="text-xs text-neutral-600">選択肢(1行に1つずつ)</span>
              <textarea
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                rows={4}
                className="w-64 rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
            </label>
          )}
          <label className="flex items-center gap-2 text-sm text-neutral-900">
            <input
              type="checkbox"
              checked={isRequired}
              onChange={(e) => setIsRequired(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-200 text-primary-500 focus:ring-primary-100"
            />
            必須項目にする
          </label>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleAddCustom}
            className="self-start rounded-md bg-primary-500 px-4 py-2 text-sm text-neutral-0 disabled:opacity-40"
          >
            追加
          </button>
        </div>
      )}
    </div>
  );
}
