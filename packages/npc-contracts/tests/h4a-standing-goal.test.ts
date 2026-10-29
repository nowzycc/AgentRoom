import { it, expect } from 'vitest';
import { parseCommand } from '../src/index.js';

it('parses the existing standing lookAround goal used by H4a policy and manual requests',()=>{
 // Given
 const input={specVersion:'1.0',worldId:'world',actorId:'actor',commandId:'h4a-manual',type:'goal.request',goal:'lookAround',priorityClass:'manual',ttlMs:2000,onConflict:'replace'};
 // When
 const command=parseCommand(input);
 // Then
 expect(command.type).toBe('goal.request');
 expect('goal' in command && command.goal).toBe('lookAround');
});
