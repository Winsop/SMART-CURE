/**
 * Generic Singly Linked List Implementation (DSA Requirement D: Linked Lists)
 * 
 * Provides an O(1) append and O(1) removeOldest (head dequeue) data structure,
 * ideal for bounded FIFO event logging and telemetry buffers.
 */

export class ListNode<T> {
  public value: T;
  public next: ListNode<T> | null = null;

  constructor(value: T) {
    this.value = value;
  }
}

export class SinglyLinkedList<T> {
  public head: ListNode<T> | null = null;
  public tail: ListNode<T> | null = null;
  private _size: number = 0;
  public readonly capacity?: number;

  constructor(capacity?: number) {
    if (capacity !== undefined) {
      if (!Number.isFinite(capacity) || capacity < 1) {
        throw new Error('Capacity must be a positive integer greater than or equal to 1.');
      }
      this.capacity = Math.floor(capacity);
    }
  }

  /**
   * Appends an element to the end of the list.
   * Time Complexity: O(1)
   * Space Complexity: O(1)
   */
  public append(value: T): void {
    const newNode = new ListNode(value);

    if (!this.head || !this.tail) {
      this.head = newNode;
      this.tail = newNode;
    } else {
      this.tail.next = newNode;
      this.tail = newNode;
    }

    this._size++;

    // Bounded capacity eviction: Automatically drop the oldest node (head)
    if (this.capacity !== undefined && this._size > this.capacity) {
      this.removeOldest();
    }
  }

  /**
   * Prepends an element to the front of the list.
   * Time Complexity: O(1)
   * Space Complexity: O(1)
   */
  public prepend(value: T): void {
    const newNode = new ListNode(value);

    if (!this.head) {
      this.head = newNode;
      this.tail = newNode;
    } else {
      newNode.next = this.head;
      this.head = newNode;
    }

    this._size++;

    if (this.capacity !== undefined && this._size > this.capacity) {
      // Remove from tail if prepending with capacity, but in FIFO event log, append is primary
      this.removeTail();
    }
  }

  /**
   * Removes and returns the oldest entry (the head node).
   * Time Complexity: O(1)
   * Space Complexity: O(1)
   */
  public removeOldest(): T | null {
    if (!this.head) {
      return null;
    }

    const removedValue = this.head.value;
    this.head = this.head.next;
    this._size--;

    // If list becomes empty, clear tail pointer
    if (this._size === 0 || !this.head) {
      this.head = null;
      this.tail = null;
    }

    return removedValue;
  }

  /**
   * Removes the tail element.
   * Time Complexity: O(N) (single linked list traversal required to find previous node)
   */
  private removeTail(): T | null {
    if (!this.head) return null;

    if (this.head === this.tail) {
      const val = this.head.value;
      this.head = null;
      this.tail = null;
      this._size = 0;
      return val;
    }

    let current = this.head;
    while (current.next && current.next !== this.tail) {
      current = current.next;
    }

    const val = this.tail ? this.tail.value : null;
    current.next = null;
    this.tail = current;
    this._size--;
    return val;
  }

  /**
   * Returns current count of nodes in the list.
   * Time Complexity: O(1)
   */
  public size(): number {
    return this._size;
  }

  /**
   * Checks if list contains zero elements.
   * Time Complexity: O(1)
   */
  public isEmpty(): boolean {
    return this._size === 0;
  }

  /**
   * Clears all nodes from the linked list.
   * Time Complexity: O(1)
   */
  public clear(): void {
    this.head = null;
    this.tail = null;
    this._size = 0;
  }

  /**
   * Converts the linked list into a new shallow array snapshot containing references to the
   * elements in sequential order, suitable for React state rendering.
   * Note: This creates a new array container but does not deeply freeze or guarantee deep
   * immutability of the contained objects.
   * Time Complexity: O(N)
   * Space Complexity: O(N)
   */
  public toArray(): T[] {
    const result: T[] = [];
    let current = this.head;

    while (current !== null) {
      result.push(current.value);
      current = current.next;
    }

    return result;
  }

  /**
   * Finds the first element satisfying the predicate.
   * Time Complexity: O(N)
   */
  public find(predicate: (val: T) => boolean): T | null {
    let current = this.head;
    while (current !== null) {
      if (predicate(current.value)) {
        return current.value;
      }
      current = current.next;
    }
    return null;
  }
}
