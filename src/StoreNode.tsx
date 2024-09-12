import { Handle, NodeProps, Position } from '@xyflow/react';
import styled from '@emotion/styled';
import { EffectorNode } from './types.ts';

const StoreNodeContainer = styled.div`
    background: burlywood;
    width: 150px;
    height: 50px;

    font-size: 1rem;

    display: flex;
    align-items: center;
    justify-content: center;
`;

export const StoreNode = (props: NodeProps) => {
    return (
        <StoreNodeContainer>
            {/*<Handle type='target' position={Position.Top} style={{ left: 10 }} />*/}
            <Handle type='target' position={Position.Top} />
            <Handle type='source' position={Position.Bottom} />

            {/*<Handle type='target' position={Position.Top} id='reinit' style={{ right: 10 }} />*/}
            {/*<Handle type='target' position={Position.Top} id='.on'>*/}
            {/*    .on*/}
            {/*</Handle>*/}
            {/*<Handle type='source' position={Position.Bottom} id={'.map'}>*/}
            {/*    .map*/}
            {/*</Handle>*/}

            <div>
                {/*@ts-expect-error ts(2322)*/}
                {props.data.label}
            </div>
        </StoreNodeContainer>
    );
};

const EventNodeContainer = styled.div`
    background: lightyellow;
    width: 150px;
    height: 50px;

    font-size: 1rem;

    display: flex;
    align-items: center;
    justify-content: center;
`;

export const EventNode = (props: NodeProps<EffectorNode>) => {
    return (
        <EventNodeContainer>
            <Handle type='target' position={Position.Top} />
            <Handle type='source' position={Position.Bottom} />
            {/*<Handle type='source' position={Position.Bottom} id={'.map'} style={{ left: '20%'}}>*/}
            {/*    .map*/}
            {/*</Handle>*/}
            {/*<Handle type='source' position={Position.Bottom} id={'.filterMap'} style={{ left: '80%'}}>*/}
            {/*    .filterMap*/}
            {/*</Handle>*/}

            <div>{props.data.label}</div>
        </EventNodeContainer>
    );
};

const EffectNodeContainer = styled.div`
    background: palegreen;
    width: 150px;
    height: 50px;

    font-size: 1rem;

    display: flex;
    align-items: center;
    justify-content: center;
`;

export const EffectNode = (props: NodeProps) => {
    return (
        <EffectNodeContainer>
            <Handle type='target' position={Position.Top} />
            <Handle type='source' position={Position.Bottom} />

            {/*<Handle type='source' position={Position.Bottom} style={{ left: '75%', background: 'green' }} id={'done'}>*/}
            {/*    🔔*/}
            {/*</Handle>*/}
            {/*<Handle type='source' position={Position.Bottom} style={{ left: '90%', background: 'green' }} id={'doneData'}>*/}
            {/*    📦*/}
            {/*</Handle>*/}
            {/*<Handle type='source' position={Position.Bottom} style={{ left: '10%', background: 'darkred' }} id={'fail'}>*/}
            {/*    🔔*/}
            {/*</Handle>*/}
            {/*<Handle type='source' position={Position.Bottom} style={{ left: '25%', background: 'darkred' }} id={'failData'}>*/}
            {/*    📦*/}
            {/*</Handle>*/}

            {/*<Handle type='source' position={Position.Right} style={{ top: '10%' }} id={'finally'}>*/}
            {/*    .finally*/}
            {/*</Handle>*/}
            {/*<Handle type='source' position={Position.Right} style={{ top: '50%' }} id={'inFlight'}>*/}
            {/*    .$inFlight*/}
            {/*</Handle>*/}
            {/*<Handle type='source' position={Position.Right} style={{ top: '90%' }} id={'pending'}>*/}
            {/*    .penging*/}
            {/*</Handle>*/}

            <div>
                {/*@ts-expect-error ts(2322)*/}
                {props.data.label}
            </div>
        </EffectNodeContainer>
    );
};

const SampleNodeContainer = styled.div`
    background: lightblue;

    width: 50px;
    height: 50px;

    font-size: 1rem;

    display: flex;
    align-items: center;
    justify-content: center;
`;

export const SampleNode = (props: NodeProps) => {
    return (
        <SampleNodeContainer>
            <Handle type='target' position={Position.Top} />
            <Handle type='source' position={Position.Bottom} />

            <div>sample</div>
        </SampleNodeContainer>
    );
};
