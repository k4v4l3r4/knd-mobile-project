import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Pressable,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface Option {
  label: string;
  value: string | number;
}

interface DropdownProps {
  label?: string;
  data: Option[];
  value: string | number | null;
  onSelect: (value: string | number) => void;
  placeholder?: string;
}

const Dropdown: React.FC<DropdownProps> = ({
  label,
  data,
  value,
  onSelect,
  placeholder = 'Pilih opsi',
}) => {
  const { colors, isDarkMode } = useTheme();
  const [visible, setVisible] = useState(false);

  const selectedItem = data.find((item) => item.value === value);

  const handleSelect = (item: Option) => {
    onSelect(item.value);
    setVisible(false);
  };

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: colors.text }]}>{label}</Text>}
      
      <TouchableOpacity
        style={[
          styles.button, 
          { 
            backgroundColor: colors.card, 
            borderColor: colors.border 
          }
        ]}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.buttonText, 
          { color: selectedItem ? colors.text : colors.textSecondary }
        ]}>
          {selectedItem ? selectedItem.label : placeholder}
        </Text>
        <MaterialIcons
          name="keyboard-arrow-down"
          size={24}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable 
          style={styles.overlay} 
          onPress={() => setVisible(false)}
        >
          <View style={[styles.dropdownContainer, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{label || placeholder}</Text>
            <FlatList
              data={data}
              keyExtractor={(item) => String(item.value)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.item,
                    item.value === value && { backgroundColor: colors.primary + '15' }
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <Text
                    style={[
                      styles.itemText,
                      { color: item.value === value ? colors.primary : colors.text }
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.value === value && (
                    <MaterialIcons name="check" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              style={styles.list}
            />
            <TouchableOpacity 
              style={[styles.closeButton, { borderTopColor: colors.border }]}
              onPress={() => setVisible(false)}
            >
              <Text style={[styles.closeButtonText, { color: colors.primary }]}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  buttonText: {
    fontSize: 16,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  dropdownContainer: {
    borderRadius: 16,
    maxHeight: '60%',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    padding: 16,
    textAlign: 'center',
  },
  list: {
    paddingHorizontal: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  itemText: {
    fontSize: 16,
  },
  closeButton: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Dropdown;
