import { Handle, NodeProps, Position } from '@xyflow/react';
import styled from '@emotion/styled';

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
            <Handle type='target' position={Position.Top}/>
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

export const EventNode = (props: NodeProps) => {
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

            <div>
                {/*@ts-expect-error ts(2322)*/}
                {props.data.label}
            </div>
        </EventNodeContainer>
    );
};
