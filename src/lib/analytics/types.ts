import { ObjectId } from 'mongodb';

export type EventType =
    | 'cutting_received'
    | 'production_started'
    | 'pcs_shipped'
    | 'order_completed'
    | 'payment_received'
    | 'sample_submitted'
    | 'sample_approved'
    | 'sample_rejected';

export interface AnalyticsEvent {
    _id?: ObjectId;
    tenantId: string; // Stored as string to match existing pattern or ObjectId if migrated
    eventTime: Date;
    eventType: EventType;
    payload: Record<string, any>;
    createdAt: Date;
}

export interface DailyKPI {
    _id?: ObjectId;
    tenantId: string;
    date: string; // YYYY-MM-DD
    styleId?: string;
    vendorId?: string;
    tailorId?: string;

    // Metrics
    totalQty: number;      // Total ordered quantity
    cuttingReceived: number;
    inProductionOrders: number;
    inProductionPcs: number;
    shippedPcs: number;
    completedPcs: number;
    expectedReceivable: number;
    tailorExpense: number;

    updatedAt: Date;
}

// Interfaces for API Responses
export interface KPICardData {
    id: string;
    label: string;
    value: number | string;
    trend: number; // Percentage change
    isCurrency?: boolean;
}

export interface TrendDataPoint {
    date: string;
    value: number;
    [key: string]: any; // dynamic breakdown keys
}
