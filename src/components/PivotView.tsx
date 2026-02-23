import { useState } from 'react';
import PivotTableUI from 'react-pivottable/PivotTableUI';
import 'react-pivottable/pivottable.css';
import { Card } from '@/components/ui/card';

interface PivotViewProps {
    data: any[];
}

export default function PivotView({ data }: PivotViewProps) {
    const [pivotState, setPivotState] = useState({});

    return (
        <Card className="absolute inset-4 overflow-auto bg-card border-none shadow-none rounded-none pivottable-dark">
            <PivotTableUI
                data={data}
                onChange={s => setPivotState(s)}
                {...pivotState}
            />
        </Card>
    );
}
