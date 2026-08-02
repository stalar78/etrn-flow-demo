import type {
  ActorRole,
  ShipmentState,
  ShipmentWorkflowAction
} from "../api/etrn-flow-api";

export const shipmentStateLabels: Record<ShipmentState, string> = {
  draft: "Черновик",
  ready_for_dispatch: "Готово к отправке",
  awaiting_loading: "Ожидает прибытия на погрузку",
  loading: "Погрузка",
  in_transit: "В пути",
  awaiting_unloading: "Ожидает разгрузки",
  unloading: "Разгрузка",
  awaiting_confirmation: "Ожидает подтверждения",
  completed: "Завершено",
  attention_required: "Требует внимания",
  cancelled: "Отменено"
};

export const actorRoleLabels: Record<ActorRole, string> = {
  dispatcher: "Диспетчер",
  warehouse: "Склад",
  driver: "Водитель",
  consignee: "Грузополучатель",
  manager: "Менеджер"
};

export const actionLabels: Record<ShipmentWorkflowAction, string> = {
  prepareDispatch: "Подготовить к отправке",
  dispatch: "Отправить на погрузку",
  markVehicleArrived: "Подтвердить прибытие автомобиля",
  completeLoading: "Завершить погрузку",
  cancel: "Отменить перевозку"
};

export const eventTypeLabels: Record<string, string> = {
  shipment_created: "Демо-перевозка создана",
  dispatch: "Отправлено на погрузку",
  mark_vehicle_arrived: "Автомобиль прибыл",
  markVehicleArrived: "Автомобиль прибыл",
  complete_loading: "Погрузка завершена",
  completeLoading: "Погрузка завершена",
  arrive_for_unloading: "Прибыло к разгрузке",
  start_unloading: "Разгрузка началась",
  complete_unloading: "Разгрузка завершена",
  complete_shipment: "Перевозка завершена",
  prepareDispatch: "Подготовлено к отправке",
  cancel: "Перевозка отменена"
};

export type WorkflowActionOption = {
  action: ShipmentWorkflowAction;
  actorRole: ActorRole;
  description?: string;
  label: string;
  roleLabel: string;
  tone?: "primary" | "secondary" | "danger";
};

export const workflowActionsByState: Record<ShipmentState, WorkflowActionOption[]> = {
  draft: [
    {
      action: "prepareDispatch",
      actorRole: "dispatcher",
      description: "Переводит демо-перевозку в состояние готовности к отправке.",
      label: actionLabels.prepareDispatch,
      roleLabel: actorRoleLabels.dispatcher,
      tone: "primary"
    },
    {
      action: "cancel",
      actorRole: "dispatcher",
      description: "Отменяет только эти синтетические демо-данные.",
      label: actionLabels.cancel,
      roleLabel: actorRoleLabels.dispatcher,
      tone: "danger"
    }
  ],
  ready_for_dispatch: [
    {
      action: "dispatch",
      actorRole: "dispatcher",
      description: "Фиксирует готовность к прибытию на погрузку.",
      label: actionLabels.dispatch,
      roleLabel: actorRoleLabels.dispatcher,
      tone: "primary"
    }
  ],
  awaiting_loading: [
    {
      action: "markVehicleArrived",
      actorRole: "warehouse",
      description: "Подтверждает, что автомобиль готов к погрузке.",
      label: actionLabels.markVehicleArrived,
      roleLabel: actorRoleLabels.warehouse,
      tone: "primary"
    }
  ],
  loading: [
    {
      action: "completeLoading",
      actorRole: "warehouse",
      description: "Закрывает этап погрузки и переводит перевозку в путь.",
      label: actionLabels.completeLoading,
      roleLabel: actorRoleLabels.warehouse,
      tone: "primary"
    }
  ],
  in_transit: [],
  awaiting_unloading: [],
  unloading: [],
  awaiting_confirmation: [],
  completed: [],
  attention_required: [],
  cancelled: []
};

export const noActionMessages: Record<ShipmentState, string> = {
  draft: "Для текущего состояния доступных демонстрационных действий нет.",
  ready_for_dispatch: "Для текущего состояния доступных демонстрационных действий нет.",
  awaiting_loading: "Для текущего состояния доступных демонстрационных действий нет.",
  loading: "Для текущего состояния доступных демонстрационных действий нет.",
  in_transit: "Для этого этапа дальнейшего демонстрационного действия пока нет. История событий доступна ниже.",
  awaiting_unloading: "Для текущего состояния доступных демонстрационных действий нет.",
  unloading: "Для текущего состояния доступных демонстрационных действий нет.",
  awaiting_confirmation: "Для текущего состояния доступных демонстрационных действий нет.",
  completed: "Перевозка завершена. История событий доступна ниже.",
  attention_required: "Это состояние требует внимания. Доступных демонстрационных действий нет.",
  cancelled: "Перевозка отменена. История событий доступна ниже."
};

export const happyPathStates: ShipmentState[] = [
  "draft",
  "ready_for_dispatch",
  "awaiting_loading",
  "loading",
  "in_transit"
];

export const branchStateLabels: Partial<Record<ShipmentState, string>> = {
  attention_required: "Исключение",
  cancelled: "Отмена",
  completed: "Завершение"
};

export const apiErrorMessages: Record<string, string> = {
  invalid_shipment_id: "Не удалось открыть перевозку: некорректный идентификатор.",
  invalid_transition_request: "Запрос действия заполнен некорректно.",
  shipment_not_found: "Перевозка не найдена в текущем демо-сеансе.",
  transition_forbidden: "Выбранная роль не может выполнить это действие.",
  invalid_transition: "Это действие больше недоступно для текущего состояния перевозки.",
  transition_conflict: "Состояние перевозки уже изменилось. Данные обновлены.",
  transition_unavailable: "Не удалось выполнить действие. Повторите попытку позже.",
  guest_session_unavailable: "Не удалось подготовить демо-сеанс. Повторите попытку.",
  demo_bootstrap_unavailable: "Не удалось создать демо-данные. Повторите попытку.",
  shipment_list_unavailable: "Не удалось загрузить список перевозок.",
  shipment_detail_unavailable: "Не удалось загрузить карточку перевозки.",
  request_failed: "API временно недоступен. Проверьте запуск сервера.",
  invalid_response: "API вернул неожиданный ответ."
};

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}
